/**
 * Input sanitization and validation utilities for Communities
 * Prevents XSS attacks and ensures data integrity
 */

import he from 'he';
import { z } from 'zod';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  
  // Decode HTML entities
  let clean = he.decode(input);
  
  // Remove all script tags and their content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all style tags and their content
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove on* event attributes
  clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  clean = clean.replace(/javascript:/gi, '');
  
  // Remove data: protocol (except for images)
  clean = clean.replace(/data:(?!image\/)/gi, '');
  
  // Encode special characters
  clean = he.encode(clean, { useNamedReferences: true });
  
  return clean;
}

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Remove all HTML tags
  let clean = input.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  clean = he.decode(clean);
  
  // Remove excessive whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean;
}

/**
 * Sanitize filename for uploads
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remove path traversal attempts
  let clean = filename.replace(/\.\./g, '');
  clean = clean.replace(/[\/\\]/g, '');
  
  // Remove special characters except dots, dashes, and underscores
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (clean.length > 255) {
    const ext = clean.split('.').pop();
    const name = clean.substring(0, 240);
    clean = ext ? `${name}.${ext}` : name;
  }
  
  return clean;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || 
        url.toLowerCase().includes('data:')) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    // If not a valid URL, return empty string
    return '';
  }
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Convert to lowercase and trim
  email = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }
  
  // Additional validation to prevent injection
  if (email.includes('<') || email.includes('>') || 
      email.includes('javascript:') || email.includes('data:')) {
    return '';
  }
  
  return email;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // Remove special characters that could be used for SQL injection
  let clean = query.replace(/['"`;\\]/g, '');
  
  // Remove SQL keywords
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'ALTER', 'CREATE'];
  for (const keyword of sqlKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    clean = clean.replace(regex, '');
  }
  
  // Limit length
  clean = clean.substring(0, 100).trim();
  
  return clean;
}

/**
 * File upload validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[]; // file extensions
}

export function validateFileUpload(
  file: Express.Multer.File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed`
    };
  }

  // Check file extension
  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension ${ext} is not allowed`
    };
  }

  // Additional security checks for images
  if (file.mimetype.startsWith('image/')) {
    // Check for PHP/executable content in image files
    const buffer = file.buffer;
    const suspicious = [
      '<?php',
      '<script',
      'eval(',
      'base64_decode'
    ];
    
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    for (const pattern of suspicious) {
      if (content.includes(pattern)) {
        return {
          valid: false,
          error: 'File contains suspicious content'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  
  /**
   * Generate a CSRF token for a session
   */
  static generateToken(sessionId: string): string {
    const token = Buffer.from(Math.random().toString()).toString('base64').slice(0, 32);
    const expires = Date.now() + 3600000; // 1 hour
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens
    this.cleanup();
    
    return token;
  }
  
  /**
   * Validate a CSRF token
   */
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }
  
  /**
   * Clean up expired tokens
   */
  private static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.tokens.entries()) {
      if (value.expires < now) {
        this.tokens.delete(key);
      }
    }
  }
}

/**
 * Request signing for sensitive operations
 */
export class RequestSigner {
  private static secret = process.env.REQUEST_SIGNING_SECRET || 'default-secret-change-me';
  
  /**
   * Sign a request payload
   */
  static sign(payload: any): string {
    const crypto = require('crypto');
    const data = JSON.stringify(payload);
    const timestamp = Date.now();
    const message = `${timestamp}.${data}`;
    
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');
    
    return `${timestamp}.${signature}`;
  }
  
  /**
   * Verify a signed request
   */
  static verify(signature: string, payload: any, maxAge = 300000): boolean {
    try {
      const crypto = require('crypto');
      const [timestamp, sig] = signature.split('.');
      const ts = parseInt(timestamp);
      
      // Check age
      if (Date.now() - ts > maxAge) {
        return false;
      }
      
      // Verify signature
      const data = JSON.stringify(payload);
      const message = `${timestamp}.${data}`;
      
      const expected = crypto
        .createHmac('sha256', this.secret)
        .update(message)
        .digest('hex');
      
      return sig === expected;
    } catch {
      return false;
    }
  }
}

/**
 * Common input validation schemas
 */
export const validationSchemas = {
  communityName: z.string()
    .min(3, 'Community name must be at least 3 characters')
    .max(50, 'Community name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Community name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  communityDescription: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  
  postContent: z.string()
    .min(1, 'Post content is required')
    .max(5000, 'Post content must be less than 5000 characters'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  url: z.string()
    .url('Invalid URL format')
    .max(500, 'URL is too long'),
  
  phoneNumber: z.string()
    .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number is too short')
    .max(20, 'Phone number is too long')
};

/**
 * Middleware to sanitize all request inputs
 */
export function sanitizeMiddleware() {
  return (req: any, res: any, next: any) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          // Don't sanitize passwords or tokens
          if (!key.toLowerCase().includes('password') && 
              !key.toLowerCase().includes('token') &&
              !key.toLowerCase().includes('secret')) {
            req.body[key] = sanitizeText(req.body[key]);
          }
        }
      }
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeText(req.query[key]);
        }
      }
    }
    
    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      for (const key in req.params) {
        if (typeof req.params[key] === 'string') {
          req.params[key] = sanitizeText(req.params[key]);
        }
      }
    }
    
    next();
  };
}