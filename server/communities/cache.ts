/**
 * Simple in-memory cache for Communities database queries
 * Helps reduce database load and improve response times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (default 5 minutes)
   */
  set<T>(key: string, value: T, ttl: number = 300): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl * 1000 // Convert to milliseconds
    });
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== undefined;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern String pattern to match keys against
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Destroy the cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const queryCache = new SimpleCache();

// Cache key builders for consistency
export const cacheKeys = {
  community: (id: string) => `community:${id}`,
  communityBySlug: (slug: string) => `community:slug:${slug}`,
  userCommunities: (userId: string) => `user:${userId}:communities`,
  publicCommunities: () => 'communities:public',
  communityMembers: (communityId: string, page: number = 1) => `community:${communityId}:members:${page}`,
  communityPosts: (communityId: string, page: number = 1) => `community:${communityId}:posts:${page}`,
  featuredCommunities: () => 'communities:featured',
  trendingCommunities: () => 'communities:trending',
  communityCategories: () => 'communities:categories',
  inviteLink: (code: string) => `invite:${code}`,
  userReferrals: (userId: string) => `user:${userId}:referrals`,
  communityStats: (communityId: string) => `community:${communityId}:stats`,
  communityInvites: (communityId: string) => `community:${communityId}:invites`,
};

// Cache TTL values in seconds
export const cacheTTL = {
  short: 60,        // 1 minute for frequently changing data
  medium: 300,      // 5 minutes for moderately stable data  
  long: 900,        // 15 minutes for stable data
  veryLong: 3600,   // 1 hour for very stable data
};