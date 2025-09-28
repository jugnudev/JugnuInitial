/**
 * Rate limiting middleware for Communities API endpoints
 * Prevents abuse and ensures fair resource usage
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  blockDuration?: number; // How long to block after limit exceeded (ms)
  message?: string;       // Error message
  keyGenerator?: (req: Request) => string; // Custom key generator
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Create rate limiting middleware
   */
  middleware(options: RateLimitOptions) {
    const {
      windowMs = 1000,
      maxRequests = 5,
      blockDuration = 60000, // 1 minute block by default
      message = 'Too many requests, please try again later.',
      keyGenerator = this.defaultKeyGenerator
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = this.limits.get(key);
      
      // Check if user is blocked
      if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
        const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(entry.blockUntil).toISOString());
        
        return res.status(429).json({
          ok: false,
          error: message,
          retryAfter
        });
      }

      // Initialize or reset entry if window expired
      if (!entry || entry.resetTime <= now) {
        entry = {
          count: 0,
          resetTime: now + windowMs
        };
        this.limits.set(key, entry);
      }

      // Increment request count
      entry.count++;

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        // Block the user
        entry.blocked = true;
        entry.blockUntil = now + blockDuration;
        
        const retryAfter = Math.ceil(blockDuration / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(entry.blockUntil).toISOString());
        
        // Log suspicious activity
        console.warn(`[RateLimit] Blocked ${key} - ${entry.count} requests in window`);
        
        return res.status(429).json({
          ok: false,
          error: message,
          retryAfter
        });
      }

      // Set rate limit headers
      const remaining = Math.max(0, maxRequests - entry.count);
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      next();
    };
  }

  /**
   * Default key generator (IP + user ID if authenticated)
   */
  private defaultKeyGenerator(req: Request): string {
    const user = (req as any).user;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (user?.id) {
      return `user:${user.id}`;
    }
    
    return `ip:${ip}`;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      // Remove entries that have been inactive for over an hour
      if (entry.blockUntil && entry.blockUntil < now - 3600000) {
        this.limits.delete(key);
      } else if (!entry.blocked && entry.resetTime < now - 3600000) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Manually reset limits for a specific key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Get current stats
   */
  getStats(): { totalKeys: number; blockedKeys: number } {
    let blockedKeys = 0;
    const now = Date.now();
    
    for (const entry of this.limits.values()) {
      if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
        blockedKeys++;
      }
    }

    return {
      totalKeys: this.limits.size,
      blockedKeys
    };
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Preset configurations for different endpoint types
export const rateLimitPresets = {
  // Standard authenticated user limits
  authenticated: {
    windowMs: 1000,  // 1 second window
    maxRequests: 5,  // 5 requests per second
    message: 'Rate limit exceeded. Please slow down your requests.'
  },

  // Strict limits for unauthenticated users
  unauthenticated: {
    windowMs: 1000,  // 1 second window
    maxRequests: 1,  // 1 request per second
    message: 'Rate limit exceeded. Please sign in for higher limits.'
  },

  // Sensitive operations (login, signup, payment)
  sensitive: {
    windowMs: 60000,  // 1 minute window
    maxRequests: 5,   // 5 attempts per minute
    blockDuration: 900000, // 15 minute block after limit
    message: 'Too many attempts. Please try again later.'
  },

  // Very sensitive operations (password reset, payment processing)
  verySensitive: {
    windowMs: 300000,  // 5 minute window
    maxRequests: 3,     // 3 attempts per 5 minutes
    blockDuration: 1800000, // 30 minute block after limit
    message: 'Too many attempts. Please wait 30 minutes before trying again.'
  },

  // File uploads
  uploads: {
    windowMs: 60000,  // 1 minute window
    maxRequests: 10,  // 10 uploads per minute
    message: 'Upload limit exceeded. Please wait before uploading more files.'
  },

  // API calls that trigger external services (emails, SMS, etc)
  external: {
    windowMs: 60000,  // 1 minute window
    maxRequests: 3,   // 3 requests per minute
    blockDuration: 600000, // 10 minute block
    message: 'Too many requests to external services. Please try again later.'
  },

  // Search and discovery endpoints
  search: {
    windowMs: 1000,  // 1 second window
    maxRequests: 2,  // 2 searches per second
    message: 'Search rate limit exceeded. Please wait a moment.'
  },

  // Analytics and reporting endpoints
  analytics: {
    windowMs: 10000,  // 10 second window
    maxRequests: 5,   // 5 requests per 10 seconds
    message: 'Analytics rate limit exceeded.'
  }
};

// IP-based blocking for suspicious activity
class IPBlocker {
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason?: string): void {
    this.blockedIPs.add(ip);
    console.warn(`[IPBlocker] Blocked IP: ${ip}${reason ? ` - Reason: ${reason}` : ''}`);
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousActivity.delete(ip);
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ip: string): void {
    const count = (this.suspiciousActivity.get(ip) || 0) + 1;
    this.suspiciousActivity.set(ip, count);

    // Auto-block after too many suspicious activities
    if (count >= 10) {
      this.blockIP(ip, 'Too many suspicious activities');
    }
  }

  /**
   * Middleware to check IP blocking
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      if (this.isBlocked(ip)) {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Your IP has been blocked due to suspicious activity.'
        });
      }

      next();
    };
  }

  /**
   * Get blocked IPs list
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }
}

export const ipBlocker = new IPBlocker();