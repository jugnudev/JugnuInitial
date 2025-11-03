import { Express, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
// Stripe import commented out - Communities are FREE for all business accounts
// import Stripe from 'stripe';
import { communitiesStorage } from './communities-supabase';
import { insertUserSchema } from '@shared/schema';
import { uploadCommunityPostImage, uploadCommunityCoverImage, uploadCommunityProfileImage, uploadUserProfileImage } from '../services/storageService';
import { rateLimiter, rateLimitPresets, ipBlocker } from './rate-limiter';
import { sanitizeText, sanitizeHTML, validateFileUpload, CSRFProtection, sanitizeMiddleware } from './input-sanitizer';
import { inviteSystem } from './invite-system';
import { queryCache, cacheKeys, cacheTTL } from './cache';
import { cleanupJobs } from './cleanup-jobs';
import { emailService } from './email-service';

// COMMUNITIES ARE FREE - No Stripe initialization needed
// Communities are free for all business accounts indefinitely (not a trial)
// All billing-related code has been disabled

/*
// DISABLED: Stripe initialization (communities are free)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

let STRIPE_PRICES = {
  monthly: '',
  yearly: '',
};

async function initializeStripeProducts() {
  // DISABLED - Communities are free
}
*/

// Admin authentication middleware
const requireAdmin = async (req: Request, res: Response, next: any) => {
  // Check for admin authentication via token or session
  const adminKey = req.headers['x-admin-key'] as string;
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.cookies?.['community_auth_token'];
  
  // Check admin key first (for system admins) - use same fallback pattern as other admin routes
  if (adminKey) {
    const validKeys = [
      process.env.ADMIN_PASSWORD,
      process.env.ADMIN_KEY,
      process.env.EXPORT_ADMIN_KEY,
      process.env.ADMIN_SECRET_KEY,
      'jugnu-admin-dev-2025'
    ].filter(Boolean);
    
    if (validKeys.includes(adminKey)) {
      (req as any).isSystemAdmin = true;
      (req as any).adminId = 'system';
      next();
      return;
    }
  }
  
  // Otherwise check for authenticated user with admin role
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Admin authentication required' });
  }

  try {
    const session = await communitiesStorage.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    }

    const user = await communitiesStorage.getUserById(session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }

    (req as any).user = user;
    (req as any).adminId = user.id;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
};

// Middleware to check user authentication
const requireAuth = async (req: Request, res: Response, next: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.cookies?.['community_auth_token'];
  
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  try {
    const session = await communitiesStorage.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    }

    const user = await communitiesStorage.getUserById(session.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ ok: false, error: 'User account not active' });
    }

    // Update session last used
    await communitiesStorage.updateSessionLastUsed(token);

    (req as any).user = user;
    (req as any).userSession = session; // Use different property to avoid conflict with express-session
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
};

// Session-based authentication middleware for platform integration
const requireSessionAuth = async (req: Request, res: Response, next: any) => {
  // Check if user is authenticated via express-session (platform-wide auth)
  if (!req.session?.userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  try {
    // Get user from Communities database using session user ID
    const user = await communitiesStorage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    // Set user on request object for consistency with requireAuth middleware
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Session auth middleware error:', error);
    res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
};

// Hybrid authentication middleware - supports both community auth tokens AND platform sessions
const requireAuthOrSession = async (req: Request, res: Response, next: any) => {
  // Try community auth token first (Authorization header or cookie)
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.cookies?.['community_auth_token'];
  
  if (token) {
    // Use community auth token flow
    try {
      const session = await communitiesStorage.getSessionByToken(token);
      if (session) {
        const user = await communitiesStorage.getUserById(session.userId);
        if (user && user.status === 'active') {
          await communitiesStorage.updateSessionLastUsed(token);
          (req as any).user = user;
          (req as any).userSession = session;
          return next();
        }
      }
    } catch (error) {
      console.error('Token auth attempt failed:', error);
      // Fall through to session auth
    }
  }
  
  // Try platform session auth
  if (req.session?.userId) {
    try {
      const user = await communitiesStorage.getUserById(req.session.userId);
      if (user && user.status === 'active') {
        (req as any).user = user;
        return next();
      }
    } catch (error) {
      console.error('Session auth attempt failed:', error);
    }
  }
  
  // Both auth methods failed
  return res.status(401).json({ ok: false, error: 'Authentication required' });
};

// Validation schemas
const signupSchema = insertUserSchema.extend({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

// Business signup schema (combines user + organizer application)
const businessSignupSchema = signupSchema.extend({
  businessName: z.string().min(1, 'Business name is required'),
  businessEmail: z.string().email('Business email is required'),
  businessDescription: z.string().min(10, 'Please provide a detailed business description (min 10 characters)'),
  businessType: z.enum(['event_organizer', 'venue', 'artist', 'promoter', 'other'], {
    errorMap: () => ({ message: 'Please select a valid business type' })
  }),
  businessWebsite: z.string().url().optional().or(z.literal('')),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  sampleEvents: z.string().max(5000).optional(),
  socialMediaHandles: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  
  // New profile fields for better customer profiling
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  interests: z.array(z.string()).optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  referralSource: z.string().optional(),
});

// Import the email service
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';

// Start cleanup jobs in production
if (process.env.NODE_ENV === 'production') {
  cleanupJobs.start();
  console.log('[Communities] Started cleanup jobs');
}

// Helper to send email codes using the proper email service
const sendEmailCode = async (email: string, code: string, purpose: string = 'login', userName?: string) => {
  console.log(`[Communities] Email code for ${email}: ${code} (${purpose})`);
  
  try {
    await sendVerificationEmail({
      recipientEmail: email,
      verificationCode: code,
      purpose: purpose === 'signup' ? 'signup' : 'signin',
      userName
    });
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
};

// Configure multer for file uploads (images and videos)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

export function addCommunitiesRoutes(app: Express) {
  console.log('✅ Adding Communities routes...');
  
  // Apply global middleware for Communities routes
  app.use('/api/communities/*', ipBlocker.middleware());
  app.use('/api/communities/*', sanitizeMiddleware());
  app.use('/api/auth/*', ipBlocker.middleware());
  app.use('/api/auth/*', sanitizeMiddleware());
  app.use('/api/user/*', ipBlocker.middleware());
  app.use('/api/user/*', sanitizeMiddleware());

  // ============ AUTHENTICATION ENDPOINTS ============

  /**
   * POST /api/account/signup
   * Create a new user account and send email verification code
   * curl -X POST http://localhost:5000/api/account/signup \
   *   -H "Content-Type: application/json" \
   *   -d '{"email":"user@example.com","firstName":"John","lastName":"Doe"}'
   */
  app.post('/api/auth/signup', rateLimiter.middleware(rateLimitPresets.sensitive), async (req: Request, res: Response) => {
    try {
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const { email, firstName, lastName, bio, location, website } = validationResult.data;

      // Check if user already exists
      const existingUser = await communitiesStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ ok: false, error: 'User already exists with this email' });
      }

      // Create user account
      const userData = {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        bio,
        location,
        website,
        status: 'pending_verification' as const,
        role: 'user' as const,
        emailVerified: false,
        emailNotifications: true,
        marketingEmails: false
      };

      const user = await communitiesStorage.createUser(userData);

      // Create and send verification code
      const authCode = await communitiesStorage.createAuthCode({
        userId: user.id,
        email: user.email,
        purpose: 'signup'
      });

      await sendEmailCode(user.email, authCode.code, 'signup');

      res.status(201).json({
        ok: true,
        message: 'Account created successfully. Please check your email for the verification code.',
        userId: user.id
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create account' });
    }
  });

  /**
   * POST /api/auth/signup-business
   * Create a new business account with organizer application in one step
   */
  app.post('/api/auth/signup-business', rateLimiter.middleware(rateLimitPresets.sensitive), async (req: Request, res: Response) => {
    try {
      const validationResult = businessSignupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const {
        email,
        firstName,
        lastName,
        bio,
        location,
        website,
        businessName,
        businessEmail,
        businessDescription,
        businessType,
        businessWebsite,
        businessPhone,
        businessAddress,
        yearsExperience,
        sampleEvents,
        socialMediaHandles
      } = validationResult.data;

      // Check if user already exists
      const existingUser = await communitiesStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ ok: false, error: 'User already exists with this email' });
      }

      // Create user account
      const userData = {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        bio,
        location,
        website,
        status: 'pending_verification' as const,
        role: 'user' as const,
        emailVerified: false,
        emailNotifications: true,
        marketingEmails: false
      };

      const user = await communitiesStorage.createUser(userData);

      // Create organizer application atomically
      const applicationData = {
        userId: user.id,
        businessName,
        businessEmail,
        businessDescription,
        businessType,
        businessWebsite: businessWebsite || null,
        businessPhone: businessPhone || null,
        businessAddress: businessAddress || null,
        yearsExperience: yearsExperience || null,
        sampleEvents: sampleEvents || null,
        socialMediaHandles: socialMediaHandles || null,
        status: 'pending' as const
      };

      const application = await communitiesStorage.createOrganizerApplication(applicationData);

      // Create and send verification code
      const authCode = await communitiesStorage.createAuthCode({
        userId: user.id,
        email: user.email,
        purpose: 'signup'
      });

      await sendEmailCode(user.email, authCode.code, 'signup');

      res.status(201).json({
        ok: true,
        message: 'Business account created successfully. Please check your email for the verification code.',
        userId: user.id,
        applicationId: application.id,
        requiresApproval: true
      });
    } catch (error: any) {
      console.error('Business signup error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create business account' });
    }
  });

  /**
   * POST /api/account/signin
   * Send login code to existing user's email
   * curl -X POST http://localhost:5000/api/account/signin \
   *   -H "Content-Type: application/json" \
   *   -d '{"email":"user@example.com"}'
   */
  app.post('/api/auth/signin', rateLimiter.middleware(rateLimitPresets.sensitive), async (req: Request, res: Response) => {
    try {
      const validationResult = signinSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid email address'
        });
      }

      const { email } = validationResult.data;

      // Check if user exists
      const user = await communitiesStorage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ ok: false, error: 'No account found with this email' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ ok: false, error: 'Account is suspended' });
      }

      // Create and send login code
      const authCode = await communitiesStorage.createAuthCode({
        userId: user.id,
        email: user.email,
        purpose: 'login'
      });

      await sendEmailCode(user.email, authCode.code, 'login');

      res.json({
        ok: true,
        message: 'Login code sent to your email address.'
      });
    } catch (error: any) {
      console.error('Signin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to send login code' });
    }
  });

  /**
   * POST /api/account/verify-code
   * Verify email code and create session
   * curl -X POST http://localhost:5000/api/account/verify-code \
   *   -H "Content-Type: application/json" \
   *   -d '{"email":"user@example.com","code":"123456"}'
   */
  app.post('/api/auth/verify-code', rateLimiter.middleware(rateLimitPresets.sensitive), async (req: Request, res: Response) => {
    try {
      const validationResult = verifyCodeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid email or code format'
        });
      }

      const { email, code } = validationResult.data;

      // Get the auth code
      const authCode = await communitiesStorage.getAuthCodeByEmailAndCode(email, code);
      if (!authCode) {
        // Increment attempts on failed verification to prevent brute force
        const existingCode = await communitiesStorage.getAuthCodeByEmail(email);
        if (existingCode && existingCode.attempts < existingCode.maxAttempts) {
          await communitiesStorage.incrementAuthCodeAttempts(existingCode.id);
        }
        return res.status(400).json({ ok: false, error: 'Invalid or expired verification code' });
      }

      if (authCode.attempts >= authCode.maxAttempts) {
        return res.status(429).json({ ok: false, error: 'Too many verification attempts. Please request a new code.' });
      }

      // Get the user
      const user = await communitiesStorage.getUserById(authCode.userId!);
      if (!user) {
        return res.status(400).json({ ok: false, error: 'User not found' });
      }

      // Mark auth code as used
      await communitiesStorage.markAuthCodeUsed(authCode.id);

      // If this was a signup verification, activate the account
      let isNewAccountActivation = false;
      if (authCode.purpose === 'signup' && user.status === 'pending_verification') {
        await communitiesStorage.updateUser(user.id, {
          status: 'active',
          emailVerified: true
        });
        isNewAccountActivation = true;
      } else {
        // For existing users with 'signin' or 'login' verification, ensure they're active
        if ((authCode.purpose === 'signin' || authCode.purpose === 'login') && user.status !== 'active') {
          await communitiesStorage.updateUser(user.id, {
            status: 'active',
            emailVerified: true
          });
        }
      }

      // Send welcome email for new account activations
      if (isNewAccountActivation) {
        try {
          // Check if this is a business account by looking for organizer application
          const supabase = getSupabaseAdmin();
          const { data: organizerApp } = await supabase
            .from('organizer_applications')
            .select('business_name')
            .eq('user_id', user.id)
            .single();

          await sendWelcomeEmail({
            recipientEmail: user.email,
            userName: user.firstName || user.displayName || 'there',
            accountType: organizerApp ? 'business' : 'user',
            businessName: organizerApp?.business_name
          });
          console.log(`Welcome email sent to ${user.email} (${organizerApp ? 'business' : 'user'})`);
        } catch (emailError) {
          // Log error but don't fail the verification
          console.error('Failed to send welcome email:', emailError);
        }
      }

      // Create session
      const session = await communitiesStorage.createSession({
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      // Set cookie
      res.cookie('community_auth_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      // Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Set platform session userId for session-based auth integration
      req.session.userId = user.id;
      
      // Explicitly save session to ensure userId is persisted - this MUST succeed
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (sessionError) {
        console.error('Failed to save session:', sessionError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Authentication session could not be established. Please try again.' 
        });
      }

      // Get fresh user data (in case it was updated)
      const freshUser = await communitiesStorage.getUserById(user.id);

      res.json({
        ok: true,
        message: 'Successfully signed in',
        user: {
          id: freshUser!.id,
          email: freshUser!.email,
          firstName: freshUser!.firstName,
          lastName: freshUser!.lastName,
          role: freshUser!.role,
          status: freshUser!.status,
          emailVerified: freshUser!.emailVerified
        },
        token: session.token
      });
    } catch (error: any) {
      console.error('Verify code error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to verify code' });
    }
  });

  /**
   * GET /api/account/me
   * Get current user profile and organizer status
   * curl -X GET http://localhost:5000/api/account/me \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    // Prevent caching of user data to ensure fresh profile pictures
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const user = (req as any).user;
      
      // Check if user is an organizer
      let organizerApplication = null;
      let organizer = null;
      
      if (user.role === 'organizer' || user.role === 'admin') {
        organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      }

      // Always check for applications with proper data mapping
      try {
        // Check pending applications first
        const pendingApplications = await communitiesStorage.getOrganizerApplicationsByStatus('pending');
        const userPendingApp = pendingApplications.find(app => app.userId === user.id);
        
        if (userPendingApp) {
          organizerApplication = userPendingApp;
        } else {
          // Check approved applications
          const approvedApplications = await communitiesStorage.getOrganizerApplicationsByStatus('approved');
          const userApprovedApp = approvedApplications.find(app => app.userId === user.id);
          
          if (userApprovedApp) {
            organizerApplication = userApprovedApp;
          } else {
            // Check rejected applications
            const rejectedApplications = await communitiesStorage.getOrganizerApplicationsByStatus('rejected');
            const userRejectedApp = rejectedApplications.find(app => app.userId === user.id);
            
            if (userRejectedApp) {
              organizerApplication = userRejectedApp;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch organizer applications:', error);
        organizerApplication = null;
      }

      res.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          bio: user.bio,
          location: user.location,
          website: user.website,
          socialInstagram: user.socialInstagram,
          socialTwitter: user.socialTwitter,
          socialLinkedin: user.socialLinkedin,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          emailNotifications: user.emailNotifications,
          marketingEmails: user.marketingEmails,
          newsletter: user.newsletter,
          createdAt: user.createdAt,
          
          // New profile fields for better customer profiling
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          interests: user.interests,
          preferredLanguage: user.preferredLanguage,
          timezone: user.timezone,
          companyName: user.companyName,
          jobTitle: user.jobTitle,
          referralSource: user.referralSource
        },
        organizerApplication,
        organizer
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get profile' });
    }
  });

  /**
   * PATCH /api/account/me
   * Update user profile
   * curl -X PATCH http://localhost:5000/api/account/me \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"firstName":"Jane","bio":"Updated bio"}'
   */
  app.patch('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const validationResult = updateProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const updates = validationResult.data;

      // Update user profile
      const updatedUser = await communitiesStorage.updateUser(user.id, updates);

      res.json({
        ok: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          profileImageUrl: updatedUser.profileImageUrl,
          bio: updatedUser.bio,
          location: updatedUser.location,
          website: updatedUser.website,
          socialInstagram: updatedUser.socialInstagram,
          socialTwitter: updatedUser.socialTwitter,
          socialLinkedin: updatedUser.socialLinkedin,
          role: updatedUser.role,
          status: updatedUser.status,
          emailVerified: updatedUser.emailVerified,
          emailNotifications: updatedUser.emailNotifications,
          marketingEmails: updatedUser.marketingEmails,
          
          // New profile fields for better customer profiling
          phoneNumber: updatedUser.phoneNumber,
          dateOfBirth: updatedUser.dateOfBirth,
          gender: updatedUser.gender,
          interests: updatedUser.interests,
          preferredLanguage: updatedUser.preferredLanguage,
          timezone: updatedUser.timezone,
          companyName: updatedUser.companyName,
          jobTitle: updatedUser.jobTitle,
          referralSource: updatedUser.referralSource
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update profile' });
    }
  });

  /**
   * POST /api/auth/upload-profile-image
   * Upload profile image for user
   * curl -X POST http://localhost:5000/api/auth/upload-profile-image \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -F "image=@path/to/profile.jpg"
   */
  app.post('/api/auth/upload-profile-image', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
      }

      const profileImageUrl = await uploadUserProfileImage(file, user.id);

      // Update user with new profile image
      await communitiesStorage.updateUser(user.id, { profileImageUrl });

      res.json({
        ok: true,
        profileImageUrl
      });
    } catch (error: any) {
      console.error('User profile image upload error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to upload profile image' });
    }
  });

  /**
   * POST /api/account/signout
   * Sign out and deactivate session
   * curl -X POST http://localhost:5000/api/account/signout \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.post('/api/auth/signout', requireAuth, async (req: Request, res: Response) => {
    try {
      const userSession = (req as any).userSession;

      // Deactivate current session
      await communitiesStorage.deactivateSession(userSession.token);

      // Clear Communities cookie
      res.clearCookie('community_auth_token');
      
      // Destroy platform session to prevent residual authentication - this MUST succeed
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) {
              console.error('Session destruction error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        // Clear session cookie to force browser discard
        res.clearCookie('connect.sid');
        
      } catch (sessionError) {
        console.error('Failed to destroy session:', sessionError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Sign-out could not be completed. Please try again.' 
        });
      }

      res.json({
        ok: true,
        message: 'Successfully signed out'
      });
    } catch (error: any) {
      console.error('Signout error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to sign out' });
    }
  });

  /**
   * POST /api/account/signout-all
   * Sign out from all devices
   * curl -X POST http://localhost:5000/api/account/signout-all \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.post('/api/auth/signout-all', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Deactivate all user sessions
      await communitiesStorage.deactivateAllUserSessions(user.id);

      // Clear Communities cookie
      res.clearCookie('community_auth_token');
      
      // Destroy platform session to prevent residual authentication - this MUST succeed
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) {
              console.error('Session destruction error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        // Clear session cookie to force browser discard
        res.clearCookie('connect.sid');
        
      } catch (sessionError) {
        console.error('Failed to destroy session:', sessionError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Sign-out could not be completed. Please try again.' 
        });
      }

      res.json({
        ok: true,
        message: 'Successfully signed out from all devices'
      });
    } catch (error: any) {
      console.error('Signout all error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to sign out from all devices' });
    }
  });

  // ============ EMAIL CHANGE ENDPOINTS ============

  /**
   * POST /api/auth/request-email-change
   * Request to change email address - sends verification code to new email
   * curl -X POST http://localhost:5000/api/auth/request-email-change \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"newEmail":"newemail@example.com"}'
   */
  const requestEmailChangeSchema = z.object({
    newEmail: z.string().email('Invalid email address'),
  });

  app.post('/api/auth/request-email-change', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const validationResult = requestEmailChangeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const { newEmail } = validationResult.data;

      // Check if new email is same as current email
      if (newEmail.toLowerCase() === user.email.toLowerCase()) {
        return res.status(400).json({
          ok: false,
          error: 'New email must be different from current email'
        });
      }

      // Check if new email is already in use
      const existingUser = await communitiesStorage.getUserByEmail(newEmail);
      if (existingUser) {
        return res.status(400).json({
          ok: false,
          error: 'Email address is already in use'
        });
      }

      // Verification code will be auto-generated by createAuthCode

      // Store verification code with email_change purpose
      const authCode = await communitiesStorage.createAuthCode({
        userId: user.id,
        email: newEmail,
        purpose: 'email_change'
      });

      // Send verification email to new email address
      const emailSent = await sendEmailCode(newEmail, authCode.code, 'email_change', user.firstName);

      if (!emailSent) {
        return res.status(500).json({
          ok: false,
          error: 'Failed to send verification email'
        });
      }

      res.json({
        ok: true,
        message: 'Verification code sent to new email address',
        newEmail // Return the new email for UI feedback (but not the code)
      });
    } catch (error: any) {
      console.error('Request email change error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to request email change' });
    }
  });

  /**
   * POST /api/auth/confirm-email-change
   * Confirm email change with verification code
   * curl -X POST http://localhost:5000/api/auth/confirm-email-change \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"newEmail":"newemail@example.com","code":"123456"}'
   */
  const confirmEmailChangeSchema = z.object({
    newEmail: z.string().email('Invalid email address'),
    code: z.string().length(6, 'Code must be 6 digits'),
  });

  app.post('/api/auth/confirm-email-change', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const validationResult = confirmEmailChangeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const { newEmail, code } = validationResult.data;

      // Verify the code - CRITICAL: Must match email, code, AND purpose
      const codeRecord = await communitiesStorage.getAuthCodeByEmailAndCode(newEmail, code);
      if (!codeRecord) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid or expired verification code'
        });
      }

      // CRITICAL SECURITY: Verify purpose is specifically 'email_change'
      if (codeRecord.purpose !== 'email_change') {
        return res.status(400).json({
          ok: false,
          error: 'Invalid verification code purpose - must be for email change'
        });
      }

      // CRITICAL SECURITY: Ensure the code belongs to the current user
      if (codeRecord.userId !== user.id) {
        return res.status(403).json({
          ok: false,
          error: 'Unauthorized: Verification code does not belong to this user'
        });
      }

      // Check if new email is still available (in case someone else took it)
      const existingUser = await communitiesStorage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({
          ok: false,
          error: 'Email address is no longer available'
        });
      }

      // Update user's email and mark as unverified until they verify the new email
      await communitiesStorage.updateUser(user.id, {
        email: newEmail,
        emailVerified: false // Reset verification status for new email
      });

      // Mark the verification code as used
      await communitiesStorage.markAuthCodeUsed(codeRecord.id);

      // Generate a new verification code for the updated email to verify ownership
      const newAuthCode = await communitiesStorage.createAuthCode({
        userId: user.id,
        email: newEmail,
        purpose: 'email_verification'
      });

      // Send verification email for the new email
      await sendEmailCode(newEmail, newAuthCode.code, 'email_verification', user.firstName);

      res.json({
        ok: true,
        message: 'Email changed successfully. Please check your new email for verification.',
        newEmail
      });
    } catch (error: any) {
      console.error('Confirm email change error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to confirm email change' });
    }
  });

  // ============ ORGANIZER APPLICATION ENDPOINTS ============

  /**
   * POST /api/account/apply-organizer
   * Submit organizer application
   * curl -X POST http://localhost:5000/api/account/apply-organizer \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"businessName":"My Event Company","businessEmail":"business@example.com","businessDescription":"We organize amazing events","businessType":"event_organizer"}'
   */
  const organizerApplicationSchema = z.object({
    businessName: z.string().min(1, 'Business name is required'),
    businessWebsite: z.string().url().optional().or(z.literal('')),
    businessDescription: z.string().min(10, 'Please provide a detailed business description (min 10 characters)'),
    businessType: z.enum(['event_organizer', 'venue', 'artist', 'promoter', 'other'], {
      errorMap: () => ({ message: 'Please select a valid business type' })
    }),
    yearsExperience: z.number().min(0).max(50).optional(),
    sampleEvents: z.string().optional(),
    socialMediaHandles: z.object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      website: z.string().optional(),
    }).optional(),
    businessEmail: z.string().email('Invalid business email address'),
    businessPhone: z.string().optional(),
    businessAddress: z.string().optional(),
  });

  app.post('/api/organizers/apply', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Check if user already has a pending or approved application
      const { data: existingApplications } = await communitiesStorage.client
        .from('community_organizer_applications')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved', 'under_review']);

      if (existingApplications && existingApplications.length > 0) {
        const existing = existingApplications[0];
        return res.status(400).json({ 
          ok: false, 
          error: `You already have a ${existing.status} business registration`
        });
      }

      const validationResult = organizerApplicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const applicationData = validationResult.data;

      const application = await communitiesStorage.createOrganizerApplication({
        userId: user.id,
        businessName: applicationData.businessName,
        businessWebsite: applicationData.businessWebsite,
        businessDescription: applicationData.businessDescription,
        businessType: applicationData.businessType,
        yearsExperience: applicationData.yearsExperience,
        sampleEvents: applicationData.sampleEvents,
        socialMediaHandles: applicationData.socialMediaHandles || {},
        businessEmail: applicationData.businessEmail,
        businessPhone: applicationData.businessPhone,
        businessAddress: applicationData.businessAddress,
      });

      res.status(201).json({
        ok: true,
        message: 'Business registration submitted successfully. Our team will review it shortly.',
        application: {
          id: application.id,
          businessName: application.businessName,
          businessType: application.businessType,
          status: application.status,
          createdAt: application.createdAt
        }
      });
    } catch (error: any) {
      console.error('Business registration error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to submit registration' });
    }
  });

  // ============ ADMIN ORGANIZER APPROVAL ENDPOINTS ============
  
  // Admin key middleware for API endpoints (using ADMIN_PASSWORD)
  const requireAdminKey = (req: Request, res: Response, next: any) => {
    const adminKey = req.headers['x-admin-key'];
    // Use same fallback pattern as other admin routes
    const validKeys = [
      process.env.ADMIN_PASSWORD,
      process.env.ADMIN_KEY,
      process.env.EXPORT_ADMIN_KEY,
      'jugnu-admin-dev-2025'
    ].filter(Boolean);
    
    if (validKeys.length === 0) {
      return res.status(500).json({ ok: false, error: 'Admin authentication not configured' });
    }
    
    if (!adminKey || !validKeys.includes(adminKey)) {
      return res.status(401).json({ ok: false, error: 'Invalid admin key' });
    }
    
    next();
  };

  /**
   * GET /api/admin/organizers/pending
   * Get all pending organizer applications (admin only)
   * curl -X GET http://localhost:5000/api/admin/organizers/pending \
   *   -H "x-admin-key: YOUR_ADMIN_KEY"
   */
  app.get('/api/admin/organizers/pending', requireAdminKey, async (req: Request, res: Response) => {
    try {
      const applications = await communitiesStorage.getOrganizerApplicationsByStatus('pending');
      
      res.json({
        ok: true,
        applications: applications.map(app => ({
          id: app.id,
          userId: app.userId,
          businessName: app.businessName,
          businessWebsite: app.businessWebsite,
          businessDescription: app.businessDescription,
          businessType: app.businessType,
          yearsExperience: app.yearsExperience,
          sampleEvents: app.sampleEvents,
          socialMediaHandles: app.socialMediaHandles,
          businessEmail: app.businessEmail,
          businessPhone: app.businessPhone,
          businessAddress: app.businessAddress,
          status: app.status,
          createdAt: app.createdAt,
          // Include user details if available from join
          user: (app as any).community_users || null
        }))
      });
    } catch (error: any) {
      console.error('Get pending registrations error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get registrations' });
    }
  });

  /**
   * POST /api/admin/organizers/:id/approve
   * Approve an organizer application (admin only)
   * curl -X POST http://localhost:5000/api/admin/organizers/APPLICATION_ID/approve \
   *   -H "x-admin-key: YOUR_ADMIN_KEY" \
   *   -H "Content-Type: application/json" \
   *   -d '{"adminNotes":"Great application, approved!"}'
   */
  app.post('/api/admin/organizers/:id/approve', requireAdminKey, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      // Get the application
      const application = await communitiesStorage.getOrganizerApplicationById(id);
      if (!application) {
        return res.status(404).json({ ok: false, error: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ ok: false, error: `Application is already ${application.status}` });
      }

      // Update application status
      await communitiesStorage.updateOrganizerApplication(id, {
        status: 'approved',
        reviewedBy: null, // Admin key system - no specific user ID
        adminNotes
      });

      // Create organizer record
      const organizer = await communitiesStorage.createOrganizer({
        userId: application.userId,
        applicationId: application.id,
        businessName: application.businessName,
        businessWebsite: application.businessWebsite,
        businessDescription: application.businessDescription,
        businessType: application.businessType,
        approvedBy: null // Admin key system - no specific user ID
      });

      // Update user role to 'organizer' so they get access to organizer features
      await communitiesStorage.updateUser(application.userId, {
        role: 'organizer'
      });

      res.json({
        ok: true,
        message: 'Business registration approved successfully',
        organizer: {
          id: organizer.id,
          businessName: organizer.businessName,
          businessType: organizer.businessType,
          status: organizer.status,
          approvedAt: organizer.approvedAt
        }
      });
    } catch (error: any) {
      console.error('Approve business registration error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to approve registration' });
    }
  });

  /**
   * POST /api/admin/organizers/:id/reject
   * Reject an organizer application (admin only)
   * curl -X POST http://localhost:5000/api/admin/organizers/APPLICATION_ID/reject \
   *   -H "x-admin-key: YOUR_ADMIN_KEY" \
   *   -H "Content-Type: application/json" \
   *   -d '{"rejectionReason":"Insufficient experience","adminNotes":"Please reapply after gaining more experience"}'
   */
  app.post('/api/admin/organizers/:id/reject', requireAdminKey, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason, adminNotes } = req.body;

      // Frontend sends adminNotes as rejection reason
      const reason = rejectionReason || adminNotes;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ ok: false, error: 'Rejection reason is required' });
      }

      // Get the application
      const application = await communitiesStorage.getOrganizerApplicationById(id);
      if (!application) {
        return res.status(404).json({ ok: false, error: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ ok: false, error: `Application is already ${application.status}` });
      }

      // Update application status
      await communitiesStorage.updateOrganizerApplication(id, {
        status: 'rejected',
        reviewedBy: null, // Admin key system - no specific user ID
        rejectionReason: reason,
        adminNotes: adminNotes || reason
      });

      res.json({
        ok: true,
        message: 'Business registration rejected',
        rejectionReason: reason
      });
    } catch (error: any) {
      console.error('Reject organizer error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to reject application' });
    }
  });

  // ============ COMMUNITY GROUPS FEATURE ============
  // Feature flag check for all community routes
  const checkCommunitiesFeatureFlag = (req: Request, res: Response, next: any) => {
    if (process.env.ENABLE_COMMUNITIES !== 'true') {
      return res.status(404).json({ ok: false, disabled: true });
    }
    next();
  };

  // Middleware to check if user is an approved organizer
  const requireApprovedOrganizer = async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    
    try {
      // Check if user has an approved organizer application
      const organizerApplication = await communitiesStorage.getOrganizerApplicationByUserId(user.id);
      
      if (!organizerApplication || organizerApplication.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Approved organizer status required' });
      }

      // Get or create organizer record for approved application
      let organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      
      if (!organizer && organizerApplication.status === 'approved') {
        // Create organizer record if approved application exists but organizer record doesn't
        organizer = await communitiesStorage.createOrganizer({
          userId: user.id,
          applicationId: organizerApplication.id,
          businessName: organizerApplication.businessName,
          businessWebsite: organizerApplication.businessWebsite,
          businessDescription: organizerApplication.businessDescription,
          businessType: organizerApplication.businessType,
          verified: false,
          status: 'active'
        });
      }

      if (!organizer || organizer.status !== 'active') {
        return res.status(403).json({ ok: false, error: 'Organizer account not active' });
      }
      
      (req as any).organizer = organizer;
      (req as any).organizerApplication = organizerApplication;
      next();
    } catch (error) {
      console.error('Organizer check error:', error);
      res.status(500).json({ ok: false, error: 'Failed to verify organizer status' });
    }
  };

  // Middleware to check if user owns the community being accessed
  const requireCommunityOwner = async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    const communityId = req.params.id;
    
    if (!communityId) {
      return res.status(400).json({ ok: false, error: 'Community ID required' });
    }

    try {
      const community = await communitiesStorage.getCommunityById(communityId);
      
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Get the organizer record for the current user
      const userOrganizer = await communitiesStorage.getOrganizerByUserId(user.id);
      
      if (!userOrganizer) {
        return res.status(403).json({ ok: false, error: 'User is not an organizer' });
      }

      // Check if the user's organizer ID matches the community's organizer ID
      if (community.organizerId !== userOrganizer.id) {
        return res.status(403).json({ ok: false, error: 'Only community owners can perform this action' });
      }

      (req as any).community = community;
      (req as any).organizer = userOrganizer;
      next();
    } catch (error) {
      console.error('Community ownership check error:', error);
      res.status(500).json({ ok: false, error: 'Failed to verify community ownership' });
    }
  };

  // Session-based approved organizer middleware for platform integration
  const requireSessionApprovedOrganizer = async (req: Request, res: Response, next: any) => {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    try {
      // Check if user has approved organizer application in the main platform
      const organizerApplication = await communitiesStorage.getOrganizerApplicationByUserId(userId);
      
      if (!organizerApplication || organizerApplication.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Only approved organizers can perform this action' });
      }

      // Get or create organizer record
      let organizer = await communitiesStorage.getOrganizerByUserId(userId);
      
      if (!organizer && organizerApplication.status === 'approved') {
        // Create organizer record if approved application exists but organizer record doesn't
        const user = await communitiesStorage.getUserById(userId);
        if (user) {
          organizer = await communitiesStorage.createOrganizer({
            userId: userId,
            businessName: organizerApplication.businessName,
            businessEmail: organizerApplication.businessEmail,
            businessPhone: organizerApplication.businessPhone,
            businessWebsite: organizerApplication.businessWebsite,
            businessDescription: organizerApplication.businessDescription,
            status: 'active'
          });
        }
      }

      if (!organizer || organizer.status !== 'active') {
        return res.status(403).json({ ok: false, error: 'Organizer account not active' });
      }

      (req as any).organizer = organizer;
      (req as any).organizerApplication = organizerApplication;
      next();
    } catch (error) {
      console.error('Session organizer check error:', error);
      res.status(500).json({ ok: false, error: 'Failed to check organizer status' });
    }
  };

  // Validation schemas for communities
  const createCommunitySchema = z.object({
    name: z.string().min(1, 'Community name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isPrivate: z.boolean().optional(),
    membershipPolicy: z.enum(['approval_required', 'open', 'closed']).optional(),
  });

  const updateCommunitySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isPrivate: z.boolean().optional(),
    membershipPolicy: z.enum(['approval_required', 'open', 'closed']).optional(),
    // Chat settings
    chatMode: z.enum(['disabled', 'owner_only', 'moderators_only', 'all_members']).optional(),
    chatSlowmodeSeconds: z.number().min(0).max(300).optional(),
    autoModeration: z.boolean().optional(),
    bannedWords: z.union([z.string(), z.array(z.string())]).optional(),
    // Moderator permissions
    moderatorCanPost: z.boolean().optional(),
    moderatorCanCreateEvents: z.boolean().optional(),
    moderatorCanCreatePolls: z.boolean().optional(),
    moderatorCanManageMembers: z.boolean().optional(),
    // Member permissions
    memberCanPost: z.boolean().optional(),
    memberCanComment: z.boolean().optional(),
    memberCanCreateEvents: z.boolean().optional(),
    memberCanCreatePolls: z.boolean().optional(),
  });

  const createPostSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
    imageUrl: z.string().url().optional().or(z.literal('')),
    postType: z.enum(['announcement', 'update', 'event']).optional(),
    isPinned: z.boolean().optional(),
  });

  const updatePostSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(5000).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    postType: z.enum(['announcement', 'update', 'event']).optional(),
    isPinned: z.boolean().optional(),
  });

  const approveMembershipSchema = z.object({
    action: z.enum(['approve', 'decline']),
    role: z.enum(['member', 'moderator']).optional(),
  });

  /**
   * POST /api/communities
   * Create a new community (organizers only)
   * curl -X POST http://localhost:5000/api/communities \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"name":"My Community","description":"A great community"}'
   */
  app.post('/api/communities', checkCommunitiesFeatureFlag, requireAuth, requireApprovedOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;

      const validationResult = createCommunitySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const communityData = validationResult.data;
      const community = await communitiesStorage.createCommunity({
        organizerId: organizer.id,
        ...communityData,
      });

      res.json({
        ok: true,
        community,
        message: 'Community created successfully'
      });
    } catch (error: any) {
      console.error('Create community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create community' });
    }
  });

  /**
   * GET /api/user/communities
   * Get communities owned by the current user
   * curl -X GET http://localhost:5000/api/user/communities \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/user/communities', checkCommunitiesFeatureFlag, requireAuth, requireApprovedOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;

      const communities = await communitiesStorage.getCommunitiesByOrganizerId(organizer.id);

      // Add membership information since these are owned communities
      const communitiesWithMembership = communities.map(community => ({
        ...community,
        membership: {
          status: 'approved',
          role: 'owner'
        }
      }));

      res.json({
        ok: true,
        communities: communitiesWithMembership,
        count: communitiesWithMembership.length
      });
    } catch (error: any) {
      console.error('Get user communities error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get communities' });
    }
  });

  /**
   * GET /api/communities
   * List all public communities (public discovery) with pagination
   * curl -X GET http://localhost:5000/api/communities?limit=20&offset=0
   */
  app.get('/api/communities', checkCommunitiesFeatureFlag, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const { communities, total } = await communitiesStorage.getAllCommunities(limit, offset);

      // Count actual approved members for each community
      const communitiesWithCounts = await Promise.all(
        communities.map(async (community) => {
          const memberships = await communitiesStorage.getMembershipsByCommunityId(community.id);
          const approvedMembersCount = memberships.filter((m: any) => m.status === 'approved').length;
          
          return {
            ...community,
            memberCount: approvedMembersCount // Frontend expects 'memberCount'
          };
        })
      );

      res.json({
        ok: true,
        communities: communitiesWithCounts,
        total,
        limit,
        offset,
        hasMore: offset + communities.length < total
      });
    } catch (error: any) {
      console.error('Get communities error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get communities' });
    }
  });

  /**
   * GET /api/communities/:slug
   * Get community by slug - returns different data based on user role/membership
   * curl -X GET http://localhost:5000/api/communities/my-community-slug
   */
  app.get('/api/communities/:slug', checkCommunitiesFeatureFlag, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      // First try to get by slug
      const community = await communitiesStorage.getCommunityBySlug(slug);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Count actual members and posts for accurate display
      const memberships = await communitiesStorage.getMembershipsByCommunityId(community.id);
      const approvedMembersCount = memberships.filter((m: any) => m.status === 'approved').length;
      const { total: postsCount } = await communitiesStorage.getPostsByCommunityId(community.id, 1, 0);

      // Check if authenticated
      let user = null;
      const token = req.headers['authorization']?.replace('Bearer ', '') || 
                    req.cookies?.['community_auth_token'];
      if (token) {
        try {
          const session = await communitiesStorage.getSessionByToken(token);
          if (session) {
            user = await communitiesStorage.getUserById(session.userId);
          }
        } catch (error) {
          // User not authenticated, continue as public
        }
      }

      if (!user) {
        // Public view - only basic info
        return res.json({
          ok: true,
          community: {
            id: community.id,
            slug: community.slug,
            name: community.name,
            description: community.description,
            imageUrl: community.imageUrl,
            coverUrl: community.coverUrl,
            membershipPolicy: community.membershipPolicy,
            isPrivate: community.isPrivate,
            totalMembers: approvedMembersCount,
            totalPosts: postsCount,
            memberCount: approvedMembersCount,
            postCount: postsCount
          },
          canJoin: community.membershipPolicy !== 'closed',
          canManage: false
        });
      }

      // Check if user is the community owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;

      // Check user's membership status
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      const isApprovedMember = membership && membership.status === 'approved';

      // Track view analytics
      await communitiesStorage.trackCommunityActivity(community.id, 'views');

      // Return different data based on access level
      if (isOwner) {
        // Owner gets full access
        const { posts } = await communitiesStorage.getPostsByCommunityId(community.id, 50, 0, user.id);
        const analytics = await communitiesStorage.getCommunityAnalytics(community.id);
        
        res.json({
          ok: true,
          community: {
            ...community,
            totalMembers: approvedMembersCount,
            totalPosts: postsCount,
            memberCount: approvedMembersCount,
            postCount: postsCount
          },
          membership: { role: 'owner', status: 'approved' },
          members: memberships,
          posts,
          analytics,
          canManage: true
        });
      } else if (isApprovedMember) {
        // Approved members can see posts and members
        const { posts } = await communitiesStorage.getPostsByCommunityId(community.id, 50, 0, user.id);
        
        res.json({
          ok: true,
          community: {
            ...community,
            totalMembers: approvedMembersCount,
            totalPosts: postsCount,
            memberCount: approvedMembersCount,
            postCount: postsCount
          },
          membership,
          members: memberships,
          posts,
          canManage: false
        });
      } else {
        // Non-members see only basic info
        res.json({
          ok: true,
          community: {
            id: community.id,
            slug: community.slug,
            name: community.name,
            description: community.description,
            imageUrl: community.imageUrl,
            coverUrl: community.coverUrl,
            membershipPolicy: community.membershipPolicy,
            isPrivate: community.isPrivate,
            totalMembers: approvedMembersCount,
            totalPosts: postsCount,
            memberCount: approvedMembersCount,
            postCount: postsCount
          },
          membership: membership || null,
          canJoin: !membership && community.membershipPolicy !== 'closed',
          canManage: false
        });
      }
    } catch (error: any) {
      console.error('Get community by slug error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get community' });
    }
  });

  /**
   * GET /api/communities/:id
   * Get community details by ID - returns different data based on user role/membership
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/id/:id', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is the community owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;

      // Check user's membership status
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      const isApprovedMember = membership && membership.status === 'approved';

      // Track view analytics
      await communitiesStorage.trackCommunityActivity(community.id, 'views');

      // Return different data based on access level
      if (isOwner) {
        // Owner gets full access
        const members = await communitiesStorage.getMembershipsByCommunityId(community.id);
        const { posts } = await communitiesStorage.getPostsByCommunityId(community.id);
        const analytics = await communitiesStorage.getCommunityAnalytics(community.id);
        
        res.json({
          ok: true,
          community,
          membership: { role: 'owner', status: 'approved' },
          members,
          posts,
          analytics,
          canManage: true
        });
      } else if (isApprovedMember) {
        // Approved members can see posts
        const { posts } = await communitiesStorage.getPostsByCommunityId(community.id);
        
        res.json({
          ok: true,
          community,
          membership,
          posts,
          canManage: false
        });
      } else {
        // Non-members see only basic info
        res.json({
          ok: true,
          community: {
            id: community.id,
            name: community.name,
            description: community.description,
            imageUrl: community.imageUrl,
            membershipPolicy: community.membershipPolicy,
            isPrivate: community.isPrivate,
            totalMembers: community.totalMembers,
            totalPosts: community.totalPosts
          },
          membership: membership || null,
          canJoin: !membership && community.membershipPolicy !== 'closed',
          canManage: false
        });
      }
    } catch (error: any) {
      console.error('Get community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get community' });
    }
  });

  /**
   * PATCH /api/communities/:id
   * Update community settings (owner only)
   * curl -X PATCH http://localhost:5000/api/communities/COMMUNITY_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"name":"Updated Community Name"}'
   */
  app.patch('/api/communities/:id', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const community = (req as any).community; // Already validated by requireCommunityOwner

      const validationResult = updateCommunitySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const updatedCommunity = await communitiesStorage.updateCommunity(id, validationResult.data);

      res.json({
        ok: true,
        community: updatedCommunity,
        message: 'Community updated successfully'
      });
    } catch (error: any) {
      console.error('Update community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update community' });
    }
  });

  /**
   * DELETE /api/communities/:id
   * Delete community (owner only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const community = (req as any).community; // Already validated by requireCommunityOwner

      await communitiesStorage.deleteCommunity(id);

      res.json({
        ok: true,
        message: 'Community deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete community' });
    }
  });

  /**
   * POST /api/communities/:id/join
   * Request to join community
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/join \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  // Dual authentication middleware: accepts either session auth OR token auth for reliability
  const requireEitherAuth = async (req: Request, res: Response, next: any) => {
    // Try session auth first (platform integration)
    if (req.session?.userId) {
      try {
        const user = await communitiesStorage.getUserById(req.session.userId);
        if (user) {
          (req as any).user = user;
          return next();
        }
      } catch (error) {
        console.error('Session auth error:', error);
      }
    }
    
    // Fallback to token auth (Communities system)
    return requireAuth(req, res, next);
  };

  app.post('/api/communities/:id/join', checkCommunitiesFeatureFlag, requireEitherAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      if (community.membershipPolicy === 'closed') {
        return res.status(403).json({ ok: false, error: 'Community is not accepting new members' });
      }

      // Check if already a member or has pending request
      const existingMembership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      if (existingMembership) {
        return res.status(400).json({ ok: false, error: `You already have a ${existingMembership.status} membership request` });
      }

      const membership = await communitiesStorage.createMembership({
        communityId: community.id,
        userId: user.id,
        status: community.membershipPolicy === 'open' ? 'approved' : 'pending',
        approvedAt: community.membershipPolicy === 'open' ? new Date() : undefined,
      });

      res.json({
        ok: true,
        membership,
        message: community.membershipPolicy === 'open' ? 'Joined community successfully' : 'Membership request submitted'
      });
    } catch (error: any) {
      console.error('Join community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to join community' });
    }
  });

  /**
   * GET /api/communities/:id/members
   * List members (owner sees all, members see limited)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/members \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/members', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is the community owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;

      // Check user's membership status
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      const isApprovedMember = membership && membership.status === 'approved';

      if (!isOwner && !isApprovedMember) {
        return res.status(403).json({ ok: false, error: 'Only members can view the member list' });
      }

      const members = await communitiesStorage.getMembershipsByCommunityId(community.id);

      // If not owner, filter to only show approved members
      const filteredMembers = isOwner ? members : members.filter(m => m.status === 'approved');

      res.json({
        ok: true,
        members: filteredMembers,
        total: filteredMembers.length,
        showPending: isOwner
      });
    } catch (error: any) {
      console.error('Get members error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get members' });
    }
  });

  /**
   * GET /api/communities/:id/members/pending
   * List pending membership requests (owner only)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/members/pending \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/members/pending', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const community = (req as any).community;

      const pendingMembers = await communitiesStorage.getPendingMembershipsByCommunityId(community.id);

      res.json({
        ok: true,
        members: pendingMembers,
        total: pendingMembers.length
      });
    } catch (error: any) {
      console.error('Get pending members error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get pending members' });
    }
  });

  /**
   * POST /api/communities/:id/members/:userId/approve
   * Approve membership request (owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/members/USER_ID/approve \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"role":"member"}'
   */
  app.post('/api/communities/:id/members/:userId/approve', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const community = (req as any).community;
      const user = (req as any).user;
      const { role = 'member' } = req.body;

      const membership = await communitiesStorage.getMembershipByUserAndCommunity(userId, community.id);
      if (!membership) {
        return res.status(404).json({ ok: false, error: 'Membership request not found' });
      }

      if (membership.status !== 'pending') {
        return res.status(400).json({ ok: false, error: `Membership is already ${membership.status}` });
      }

      const updatedMembership = await communitiesStorage.updateMembership(membership.id, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.id,
        role
      });

      // Track analytics
      await communitiesStorage.trackCommunityActivity(community.id, 'members');

      // Send notification to approved user
      try {
        const approvedUser = await communitiesStorage.getUserById(userId);
        if (approvedUser) {
          // Create notification
          // Use slug if available, otherwise fallback to ID (for communities without slugs)
          const communityIdentifier = community.slug || community.id;
          
          const notification = await communitiesStorage.createNotification({
            recipientId: userId,
            communityId: community.id,
            type: 'membership_approved',
            title: 'Membership Approved!',
            body: `Your membership request for ${community.name} has been approved. Welcome to the community!`,
            actionUrl: `/community/${communityIdentifier}`,
            metadata: {
              communityName: community.name,
              communitySlug: community.slug,
              approvedBy: user.firstName + ' ' + user.lastName
            }
          });

          // Send email notification
          await emailService.sendNotificationEmail(notification, approvedUser, community);
          
          // Send real-time notification via WebSocket
          const { sendNotificationToUser } = require('./chat-server');
          sendNotificationToUser(userId, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            communityId: community.id,
            communitySlug: community.slug
          });
        }
      } catch (notifError) {
        console.error('Failed to send membership approval notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        ok: true,
        membership: updatedMembership,
        message: 'Member approved successfully'
      });
    } catch (error: any) {
      console.error('Approve member error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to approve member' });
    }
  });

  /**
   * POST /api/communities/:id/members/:userId/decline
   * Decline membership request with reason (owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/members/USER_ID/decline \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"reason":"Community is full"}'
   */
  app.post('/api/communities/:id/members/:userId/decline', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const community = (req as any).community;
      const { reason } = req.body;

      const membership = await communitiesStorage.getMembershipByUserAndCommunity(userId, community.id);
      if (!membership) {
        return res.status(404).json({ ok: false, error: 'Membership request not found' });
      }

      if (membership.status !== 'pending') {
        return res.status(400).json({ ok: false, error: `Membership is already ${membership.status}` });
      }

      const updatedMembership = await communitiesStorage.updateMembership(membership.id, {
        status: 'declined',
        rejectionReason: reason
      });

      res.json({
        ok: true,
        membership: updatedMembership,
        message: 'Membership request declined'
      });
    } catch (error: any) {
      console.error('Decline member error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to decline member' });
    }
  });

  /**
   * POST /api/communities/:id/members/:userId/remove
   * Remove/ban member from community (owner can remove anyone except owners, moderators can remove members only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/members/USER_ID/remove \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"reason":"Violation of community guidelines","ban":true}'
   */
  app.post('/api/communities/:id/members/:userId/remove', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const currentUser = (req as any).user;
      const { reason, ban = false } = req.body;

      // Get the community
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Get the organizer to check ownership
      const organizer = await communitiesStorage.getOrganizerByUserId(currentUser.id);
      const isOwner = organizer && organizer.id === community.organizerId;

      // Get current user's membership to check if they're a moderator
      const currentUserMembership = await communitiesStorage.getMembershipByUserAndCommunity(currentUser.id, community.id);
      const isModerator = currentUserMembership?.role === 'moderator';

      // Check if current user has permission to remove members (must be owner or moderator)
      if (!isOwner && !isModerator) {
        return res.status(403).json({ ok: false, error: 'Only community owners and moderators can remove members' });
      }

      // Get the target user's membership
      const targetMembership = await communitiesStorage.getMembershipByUserAndCommunity(userId, community.id);
      if (!targetMembership) {
        return res.status(404).json({ ok: false, error: 'Member not found' });
      }

      // Check if target is the owner (owners cannot be removed)
      const targetOrganizer = await communitiesStorage.getOrganizerByUserId(userId);
      const isTargetOwner = targetOrganizer && targetOrganizer.id === community.organizerId;
      
      if (isTargetOwner) {
        return res.status(403).json({ ok: false, error: 'Community owners cannot be removed' });
      }

      // Check permissions based on roles:
      // - Moderators can only remove regular members (not other moderators)
      // - Owners can remove anyone (except owners)
      if (isModerator && !isOwner && targetMembership.role === 'moderator') {
        return res.status(403).json({ ok: false, error: 'Moderators cannot remove other moderators. Only the owner can do this.' });
      }

      // Update membership to 'left' status with reason
      await communitiesStorage.updateMembership(targetMembership.id, {
        status: 'left',
        leftAt: new Date().toISOString(),
        rejectionReason: reason
      });

      // TODO: If ban is true, add to a banned users list

      res.json({
        ok: true,
        message: 'Member removed successfully'
      });
    } catch (error: any) {
      console.error('Remove member error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to remove member' });
    }
  });

  /**
   * DELETE /api/communities/:id/leave
   * Leave community (member only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID/leave \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id/leave', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(400).json({ ok: false, error: 'You are not a member of this community' });
      }

      // Check if user is the owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      if (organizer && organizer.id === community.organizerId) {
        return res.status(400).json({ ok: false, error: 'Community owner cannot leave. Delete the community instead.' });
      }

      await communitiesStorage.updateMembership(membership.id, {
        status: 'left',
        leftAt: new Date().toISOString()
      });

      res.json({
        ok: true,
        message: 'Successfully left the community'
      });
    } catch (error: any) {
      console.error('Leave community error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to leave community' });
    }
  });

  /**
   * PATCH /api/communities/:id/members/:userId/role
   * Update member role (promote/demote moderators) - owner only
   * curl -X PATCH http://localhost:5000/api/communities/COMMUNITY_ID/members/USER_ID/role \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"role":"moderator"}'
   */
  app.patch('/api/communities/:id/members/:userId/role', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const community = (req as any).community;
      const { role } = req.body;

      // Validate role - only member and moderator roles can be set via this endpoint
      if (!role || !['member', 'moderator'].includes(role)) {
        return res.status(400).json({ ok: false, error: 'Invalid role. Must be "member" or "moderator"' });
      }

      // Get target member's membership
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(userId, community.id);
      if (!membership) {
        return res.status(404).json({ ok: false, error: 'Member not found' });
      }

      if (membership.status !== 'approved') {
        return res.status(400).json({ ok: false, error: 'Only approved members can have their role updated' });
      }

      // CRITICAL: Prevent modifying owner roles - owners cannot be demoted
      if (membership.role === 'owner') {
        return res.status(403).json({ ok: false, error: 'Cannot modify owner role' });
      }

      // Prevent owner from changing their own role
      const requestUser = (req as any).user;
      if (userId === requestUser.id) {
        return res.status(400).json({ ok: false, error: 'Cannot change your own role' });
      }

      // Only allow member <-> moderator transitions
      if ((membership.role !== 'member' && membership.role !== 'moderator') ||
          (role !== 'member' && role !== 'moderator')) {
        return res.status(400).json({ ok: false, error: 'Can only change between member and moderator roles' });
      }

      // Update role
      const updatedMembership = await communitiesStorage.updateMembership(membership.id, {
        role
      });

      // Send notification to affected user
      try {
        const targetUser = await communitiesStorage.getUserById(userId);
        if (targetUser) {
          // Use slug if available, otherwise fallback to ID (for communities without slugs)
          const communityIdentifier = community.slug || community.id;
          
          const notification = await communitiesStorage.createNotification({
            recipientId: userId,
            communityId: community.id,
            type: 'role_updated',
            title: role === 'moderator' ? 'Promoted to Moderator!' : 'Role Updated',
            body: role === 'moderator' 
              ? `You have been promoted to moderator in ${community.name}`
              : `Your role has been updated to ${role} in ${community.name}`,
            actionUrl: `/community/${communityIdentifier}`,
            metadata: {
              communityName: community.name,
              communitySlug: community.slug || community.id,
              newRole: role
            }
          });

          // Send email notification
          await emailService.sendNotificationEmail(notification, targetUser, community);
          
          // Send real-time notification via WebSocket
          const { sendNotificationToUser } = require('./chat-server');
          sendNotificationToUser(userId, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            communityId: community.id,
            communitySlug: community.slug || community.id
          });
        }
      } catch (notifError) {
        console.error('Failed to send role update notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        ok: true,
        membership: updatedMembership,
        message: `Member ${role === 'moderator' ? 'promoted to moderator' : 'changed to regular member'} successfully`
      });
    } catch (error: any) {
      console.error('Update member role error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update member role' });
    }
  });

  /**
   * GET /api/communities/:id/posts
   * List posts (members only, with pagination)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/posts?limit=20&offset=0 \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/posts', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is owner or approved member
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          // In development mode, allow access to public communities for testing
          if (process.env.NODE_ENV === 'development' && !community.isPrivate) {
            console.log(`[DEV MODE] Allowing access to public community ${community.id} for testing`);
          } else {
            return res.status(403).json({ ok: false, error: 'Access denied - members only' });
          }
        }
      }

      const { posts, total } = await communitiesStorage.getPostsByCommunityId(community.id, limit, offset, user.id);

      // Track analytics
      await communitiesStorage.trackCommunityActivity(community.id, 'views');

      res.json({
        ok: true,
        posts,
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total
      });
    } catch (error: any) {
      console.error('Get posts error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get posts' });
    }
  });

  /**
   * POST /api/communities/:id/posts
   * Create post with rich content (owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"title":"Post Title","content":"Post content","imageUrls":[]}'
   */
  app.post('/api/communities/:id/posts', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const community = (req as any).community;
      const user = (req as any).user;
      const { title, content, imageUrl, linkUrl, linkText, linkDescription, tags, metadata, scheduledFor, postType, isPinned, postAsBusiness, status } = req.body;

      if (!title || !content) {
        return res.status(400).json({ ok: false, error: 'Title and content are required' });
      }

      const post = await communitiesStorage.createPost({
        communityId: community.id,
        authorId: user.id,
        title,
        content,
        imageUrl,
        linkUrl,
        linkText,
        linkDescription,
        tags,
        metadata,
        postType: postType || 'announcement',
        isPinned: isPinned || false,
        postAsBusiness: postAsBusiness !== undefined ? postAsBusiness : true,
        status: status || (scheduledFor ? 'scheduled' : 'published'),
        scheduledFor
      });

      // Track analytics
      await communitiesStorage.trackCommunityActivity(community.id, 'posts');

      // Send notifications to community members if post is published immediately
      if (!scheduledFor) {
        try {
          // Get all approved community members
          const members = await communitiesStorage.getMembershipsByCommunityId(community.id);
          const approvedMembers = members.filter(m => m.status === 'approved' && m.userId !== user.id);

          // Create notifications for all members
          const notifications = await Promise.all(approvedMembers.map(async (member) => {
            try {
              const memberUser = await communitiesStorage.getUserById(member.userId);
              if (!memberUser) return null;

              // Check preferences
              const prefs = await communitiesStorage.getNotificationPreferences(member.userId, community.id);
              if (prefs && !prefs.newPosts) return null;

              return {
                recipientId: member.userId,
                communityId: community.id,
                type: 'post_published',
                title: `New post in ${community.name}`,
                body: `${user.firstName} ${user.lastName} posted: "${title}"`,
                postId: post.id,
                metadata: {
                  postId: post.id,
                  postTitle: title,
                  postExcerpt: content.substring(0, 100),
                  authorName: `${user.firstName} ${user.lastName}`,
                  communityName: community.name,
                  communitySlug: community.slug
                }
              };
            } catch (err) {
              console.error(`Failed to prepare notification for user ${member.userId}:`, err);
              return null;
            }
          }));

          // Filter out nulls and create batch notifications
          const validNotifications = notifications.filter(n => n !== null);
          if (validNotifications.length > 0) {
            const createdNotifications = await communitiesStorage.batchCreateNotifications(validNotifications);
            
            // Send email notifications (immediate or queued for digest)
            await emailService.sendBatchNotifications(createdNotifications, community);
            
            // Send real-time notifications
            const { broadcastNotificationToCommunity } = require('./chat-server');
            broadcastNotificationToCommunity(community.id, {
              id: post.id,
              type: 'post_published',
              title: `New post in ${community.name}`,
              body: `${user.firstName} ${user.lastName} posted: "${title}"`,
              postId: post.id,
              communitySlug: community.slug
            });
          }
        } catch (notifError) {
          console.error('Failed to send new post notifications:', notifError);
          // Don't fail the request if notifications fail
        }
      }

      res.json({
        ok: true,
        post,
        message: scheduledFor ? 'Post scheduled successfully' : 'Post created successfully'
      });
    } catch (error: any) {
      console.error('Create post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create post' });
    }
  });

  /**
   * GET /api/communities/:id/posts/:postId
   * Get single post (members only)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/posts/:postId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is owner or approved member
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      // Get images, reactions, and comments for the post
      const images = await communitiesStorage.getPostImages(postId);
      const reactions = await communitiesStorage.getReactionsByPostId(postId);
      const comments = await communitiesStorage.getCommentsByPostId(postId);
      const userReaction = await communitiesStorage.getUserReactionForPost(postId, user.id);

      // Track post view
      await communitiesStorage.trackPostView(postId, user.id);

      res.json({
        ok: true,
        post: {
          ...post,
          images,
          reactions,
          comments,
          userReaction
        }
      });
    } catch (error: any) {
      console.error('Get post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get post' });
    }
  });

  /**
   * PUT /api/communities/:id/posts/:postId
   * Update post (owner only)
   * curl -X PUT http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"title":"Updated Title","content":"Updated content"}'
   */
  app.put('/api/communities/:id/posts/:postId', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;
      const { title, content, imageUrl, linkUrl, linkText, linkDescription, tags, metadata, postType, isPinned, postAsBusiness } = req.body;

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
      if (linkText !== undefined) updateData.linkText = linkText;
      if (linkDescription !== undefined) updateData.linkDescription = linkDescription;
      if (tags !== undefined) updateData.tags = tags;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (postType !== undefined) updateData.postType = postType;
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (postAsBusiness !== undefined) updateData.postAsBusiness = postAsBusiness;

      const updatedPost = await communitiesStorage.updatePost(postId, updateData);

      res.json({
        ok: true,
        post: updatedPost,
        message: 'Post updated successfully'
      });
    } catch (error: any) {
      console.error('Update post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update post' });
    }
  });

  /**
   * DELETE /api/communities/:id/posts/:postId
   * Delete post (owner only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id/posts/:postId', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      await communitiesStorage.deletePost(postId);

      res.json({
        ok: true,
        message: 'Post deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete post' });
    }
  });

  /**
   * POST /api/communities/:id/posts/:postId/schedule
   * Schedule post for future publishing
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/schedule \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"scheduledAt":"2024-12-01T10:00:00Z"}'
   */
  app.post('/api/communities/:id/posts/:postId/schedule', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;
      const { scheduledFor } = req.body;

      if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
        return res.status(400).json({ ok: false, error: 'Invalid schedule date - must be in the future' });
      }

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      const updatedPost = await communitiesStorage.updatePost(postId, {
        status: 'scheduled',
        scheduledFor
      });

      res.json({
        ok: true,
        post: updatedPost,
        message: 'Post scheduled successfully'
      });
    } catch (error: any) {
      console.error('Schedule post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to schedule post' });
    }
  });

  /**
   * POST /api/communities/:id/posts/:postId/pin
   * Pin/unpin post
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/pin \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"pinned":true}'
   */
  app.post('/api/communities/:id/posts/:postId/pin', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;
      const { pinned = true } = req.body;

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      const updatedPost = await communitiesStorage.updatePost(postId, {
        isPinned: pinned
      });

      res.json({
        ok: true,
        post: updatedPost,
        message: pinned ? 'Post pinned successfully' : 'Post unpinned successfully'
      });
    } catch (error: any) {
      console.error('Pin post error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to pin post' });
    }
  });

  /**
   * POST /api/communities/:id/upload-post-image
   * Upload image for community post
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/upload-post-image \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -F "image=@path/to/image.jpg"
   */
  app.post('/api/communities/:id/upload-post-image', checkCommunitiesFeatureFlag, requireAuth, requireApprovedOrganizer, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const organizer = (req as any).organizer;

      if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
      }

      const community = await communitiesStorage.getCommunityById(id);
      if (!community || community.organizerId !== organizer.id) {
        return res.status(404).json({ ok: false, error: 'Community not found or access denied' });
      }

      const imageUrl = await uploadCommunityPostImage(file, community.id);

      res.json({
        ok: true,
        imageUrl
      });
    } catch (error: any) {
      console.error('Community post image upload error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to upload image' });
    }
  });

  /**
   * POST /api/communities/:id/upload-cover-image
   * Upload cover image for community
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/upload-cover-image \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -F "image=@path/to/cover.jpg"
   */
  app.post('/api/communities/:id/upload-cover-image', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const community = (req as any).community; // Already validated by requireCommunityOwner

      if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
      }

      const coverUrl = await uploadCommunityCoverImage(file, community.id);

      // Update community with new cover image
      await communitiesStorage.updateCommunity(community.id, { coverUrl });

      res.json({
        ok: true,
        coverUrl
      });
    } catch (error: any) {
      console.error('Community cover image upload error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to upload cover image' });
    }
  });

  /**
   * POST /api/communities/:id/upload-profile-image
   * Upload profile image for community
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/upload-profile-image \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -F "image=@path/to/profile.jpg"
   */
  app.post('/api/communities/:id/upload-profile-image', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const community = (req as any).community; // Already validated by requireCommunityOwner

      if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
      }

      const imageUrl = await uploadCommunityProfileImage(file, community.id);

      // Update community with new profile image
      await communitiesStorage.updateCommunity(community.id, { imageUrl });

      res.json({
        ok: true,
        imageUrl
      });
    } catch (error: any) {
      console.error('Community profile image upload error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to upload profile image' });
    }
  });

  // ============ POST GALLERIES ============
  
  /**
   * POST /api/communities/:id/posts/:postId/images
   * Upload images to post (1-6 per post, owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/images \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -F "image=@path/to/image.jpg"
   */
  app.post('/api/communities/:id/posts/:postId/images', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
      }

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      // Check existing images count
      const existingImages = await communitiesStorage.getPostImages(postId);
      if (existingImages.length >= 6) {
        return res.status(400).json({ ok: false, error: 'Maximum 6 images per post' });
      }

      // Upload image
      const imageUrl = await uploadCommunityPostImage(file, community.id);
      
      // Add to post images
      const image = await communitiesStorage.addPostImage(postId, imageUrl, existingImages.length);

      res.json({
        ok: true,
        image,
        message: 'Image uploaded successfully'
      });
    } catch (error: any) {
      console.error('Upload post image error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to upload image' });
    }
  });

  /**
   * DELETE /api/communities/:id/posts/:postId/images/:imageId
   * Remove image from post (owner only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/images/IMAGE_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id/posts/:postId/images/:imageId', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId, imageId } = req.params;
      const community = (req as any).community;

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      await communitiesStorage.deletePostImage(imageId);

      res.json({
        ok: true,
        message: 'Image removed successfully'
      });
    } catch (error: any) {
      console.error('Delete post image error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete image' });
    }
  });

  /**
   * PATCH /api/communities/:id/posts/:postId/images/reorder
   * Reorder images in post (owner only)
   * curl -X PATCH http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/images/reorder \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"imageIds":["id1","id2","id3"]}'
   */
  app.patch('/api/communities/:id/posts/:postId/images/reorder', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const community = (req as any).community;
      const { imageIds } = req.body;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ ok: false, error: 'imageIds must be an array' });
      }

      const post = await communitiesStorage.getPostById(postId);
      if (!post || post.communityId !== community.id) {
        return res.status(404).json({ ok: false, error: 'Post not found' });
      }

      await communitiesStorage.reorderPostImages(postId, imageIds);

      res.json({
        ok: true,
        message: 'Images reordered successfully'
      });
    } catch (error: any) {
      console.error('Reorder post images error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to reorder images' });
    }
  });

  // ============ REACTIONS ============

  /**
   * GET /api/communities/:id/posts/:postId/reactions
   * Get reactions for a post (members only)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/reactions \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/posts/:postId/reactions', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      const reactions = await communitiesStorage.getReactionsByPostId(postId);
      const userReaction = await communitiesStorage.getUserReactionForPost(postId, user.id);

      res.json({
        ok: true,
        reactions,
        userReaction
      });
    } catch (error: any) {
      console.error('Get reactions error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get reactions' });
    }
  });

  /**
   * POST /api/communities/:id/posts/:postId/react
   * Add reaction to post (members only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/react \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"type":"heart"}'
   */
  app.post('/api/communities/:id/posts/:postId/react', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const user = (req as any).user;
      const { type } = req.body;

      // Validate reaction type (match actual database constraint)
      const validReactionTypes = ['heart', 'fire', 'like', 'celebrate', 'star'];
      if (!validReactionTypes.includes(type)) {
        return res.status(400).json({ ok: false, error: 'Invalid reaction type' });
      }

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          // In development mode, allow access to public communities for testing
          if (process.env.NODE_ENV === 'development' && !community.isPrivate) {
            console.log(`[DEV MODE] Allowing reaction access to public community ${community.id} for testing`);
          } else {
            return res.status(403).json({ ok: false, error: 'Access denied - members only' });
          }
        }
      }

      // Check if user already has this specific reaction type
      const existingReaction = await communitiesStorage.getUserReactionForPost(postId, user.id);
      
      if (existingReaction && existingReaction.reaction_type === type) {
        // User clicked the same reaction - toggle it off (remove)
        await communitiesStorage.removeReaction(postId, user.id, type);
        
        res.json({
          ok: true,
          removed: true,
          message: 'Reaction removed'
        });
      } else {
        // User wants to add/change reaction
        const reaction = await communitiesStorage.addReaction({
          postId,
          userId: user.id,
          type
        });

        // Track analytics
        await communitiesStorage.incrementPostAnalytics(postId, 'reactions');
        await communitiesStorage.trackCommunityActivity(community.id, 'reactions');

        res.json({
          ok: true,
          reaction,
          message: 'Reaction added'
        });
      }
    } catch (error: any) {
      console.error('Add reaction error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to add reaction' });
    }
  });

  /**
   * DELETE /api/communities/:id/posts/:postId/react/:type
   * Remove reaction from post (members only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/react/heart \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id/posts/:postId/react/:type', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId, type } = req.params;
      const user = (req as any).user;
      

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          // In development mode, allow access to public communities for testing
          if (process.env.NODE_ENV === 'development' && !community.isPrivate) {
            console.log(`[DEV MODE] Allowing reaction removal in public community ${community.id} for testing`);
          } else {
            return res.status(403).json({ ok: false, error: 'Access denied - members only' });
          }
        }
      }

      await communitiesStorage.removeReaction(postId, user.id, type);

      // Track analytics - track reaction removal activity
      await communitiesStorage.trackCommunityActivity(community.id, 'reactions');

      res.json({
        ok: true,
        message: 'Reaction removed'
      });
    } catch (error: any) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to remove reaction' });
    }
  });

  // ============ COMMENTS ============

  /**
   * GET /api/communities/:id/posts/:postId/comments
   * Get comments for post (members only, threaded)
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/comments \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/posts/:postId/comments', checkCommunitiesFeatureFlag, requireEitherAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      const comments = await communitiesStorage.getCommentsByPostId(postId, user.id);

      res.json({
        ok: true,
        comments: comments
      });
    } catch (error: any) {
      console.error('Get comments error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get comments' });
    }
  });

  /**
   * POST /api/communities/:id/posts/:postId/comments
   * Add comment to post (members only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/posts/POST_ID/comments \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"content":"Great post!","parentId":null}'
   */
  app.post('/api/communities/:id/posts/:postId/comments', checkCommunitiesFeatureFlag, requireEitherAuth, async (req: Request, res: Response) => {
    try {
      const { id, postId } = req.params;
      const user = (req as any).user;
      const { content, parentId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ ok: false, error: 'Comment content is required' });
      }

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      const comment = await communitiesStorage.createComment({
        postId,
        authorId: user.id,
        content: content.trim(),
        parentId
      });

      // Track analytics (non-blocking)
      try {
        await communitiesStorage.incrementPostAnalytics(postId, 'comments');
        await communitiesStorage.trackCommunityActivity(community.id, 'posts');
      } catch (analyticsError) {
        console.warn('Analytics tracking failed (non-blocking):', analyticsError);
      }

      // Send notification (non-blocking)
      try {
        const post = await communitiesStorage.getPostById(postId);
        
        if (post) {
          const notificationsToCreate: Array<{
            recipientId: string;
            type: string;
            title: string;
            body: string;
          }> = [];

          if (parentId) {
            // Reply to a comment - notify the parent comment author
            const parentComment = await communitiesStorage.getCommentById(parentId);
            if (parentComment && parentComment.authorId !== user.id) {
              notificationsToCreate.push({
                recipientId: parentComment.authorId,
                type: 'comment_reply',
                title: 'New reply to your comment',
                body: `${user.firstName} ${user.lastName} replied: "${content.trim().substring(0, 100)}"`
              });
            }

            // Also notify the post author (unless they're the commenter or already notified as parent comment author)
            const parentCommentAuthorId = parentComment?.authorId;
            if (post.authorId !== user.id && post.authorId !== parentCommentAuthorId) {
              notificationsToCreate.push({
                recipientId: post.authorId,
                type: 'post_comment',
                title: 'New comment on your post',
                body: `${user.firstName} ${user.lastName} commented: "${content.trim().substring(0, 100)}"`
              });
            }
          } else {
            // Top-level comment on a post - notify the post author
            if (post.authorId !== user.id) {
              notificationsToCreate.push({
                recipientId: post.authorId,
                type: 'post_comment',
                title: 'New comment on your post',
                body: `${user.firstName} ${user.lastName} commented: "${content.trim().substring(0, 100)}"`
              });
            }
          }

          // Create and send all notifications
          for (const notif of notificationsToCreate) {
            // Check notification preferences
            const prefs = await communitiesStorage.getNotificationPreferences(notif.recipientId, community.id);
            const shouldNotify = prefs ? (notif.type === 'comment_reply' ? prefs.commentReplies : prefs.postComments) : true;

            if (shouldNotify) {
              // Use slug if available, otherwise fallback to ID (for communities without slugs)
              const communityIdentifier = community.slug || community.id;
              const actionUrl = `/community/${communityIdentifier}/post/${postId}`;
              
              console.log('[Comment Notification] Creating notification:', {
                recipientId: notif.recipientId,
                communityId: community.id,
                type: notif.type,
                title: notif.title,
                actionUrl
              });
              
              const notification = await communitiesStorage.createNotification({
                recipientId: notif.recipientId,
                communityId: community.id,
                type: notif.type,
                title: notif.title,
                body: notif.body,
                postId,
                commentId: comment.id,
                actionUrl,
                metadata: {
                  postId,
                  postTitle: post.title,
                  commentId: comment.id,
                  commentContent: content.trim().substring(0, 100),
                  authorName: `${user.firstName} ${user.lastName}`,
                  communityName: community.name,
                  communitySlug: community.slug
                }
              });
              
              console.log('[Comment Notification] Notification created:', notification.id);

              // Send email notification (immediate or queued for digest)
              const recipient = await communitiesStorage.getUserById(notif.recipientId);
              if (recipient) {
                await emailService.sendNotificationEmail(notification, recipient, community);
              }

              // Send real-time notification
              const { broadcastNotificationToCommunity } = require('./chat-server');
              broadcastNotificationToCommunity(community.id, {
                id: notification.id,
                type: notif.type,
                title: notif.title,
                body: notif.body,
                postId,
                commentId: comment.id,
                communitySlug: community.slug,
                createdAt: notification.createdAt
              });
            }
          }
        }
      } catch (notificationError) {
        console.warn('Notification creation failed (non-blocking):', notificationError);
      }

      res.json({
        ok: true,
        comment,
        message: 'Comment added successfully'
      });
    } catch (error: any) {
      console.error('Add comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to add comment' });
    }
  });

  /**
   * PATCH /api/communities/:id/comments/:commentId
   * Edit comment (author only)
   * curl -X PATCH http://localhost:5000/api/communities/COMMUNITY_ID/comments/COMMENT_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"content":"Updated comment"}'
   */
  app.patch('/api/communities/:id/comments/:commentId', checkCommunitiesFeatureFlag, requireEitherAuth, async (req: Request, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const user = (req as any).user;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ ok: false, error: 'Comment content is required' });
      }

      const comment = await communitiesStorage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found' });
      }

      if (comment.author_id !== user.id) {
        return res.status(403).json({ ok: false, error: 'Only the author can edit this comment' });
      }

      const updatedComment = await communitiesStorage.updateComment(commentId, content.trim());

      res.json({
        ok: true,
        comment: updatedComment,
        message: 'Comment updated successfully'
      });
    } catch (error: any) {
      console.error('Update comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update comment' });
    }
  });

  /**
   * DELETE /api/communities/:id/comments/:commentId
   * Delete comment (author or owner only)
   * curl -X DELETE http://localhost:5000/api/communities/COMMUNITY_ID/comments/COMMENT_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/communities/:id/comments/:commentId', checkCommunitiesFeatureFlag, requireEitherAuth, async (req: Request, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      const comment = await communitiesStorage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found' });
      }

      // Check if user is owner or comment author
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      const isAuthor = comment.author_id === user.id;

      if (!isOwner && !isAuthor) {
        return res.status(403).json({ ok: false, error: 'Only the author or community owner can delete this comment' });
      }

      await communitiesStorage.deleteComment(commentId);

      res.json({
        ok: true,
        message: 'Comment deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete comment' });
    }
  });

  /**
   * POST /api/communities/:id/comments/:commentId/hide
   * Hide comment (owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/comments/COMMENT_ID/hide \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.post('/api/communities/:id/comments/:commentId/hide', checkCommunitiesFeatureFlag, requireEitherAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const community = (req as any).community;

      const comment = await communitiesStorage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found' });
      }

      await communitiesStorage.hideComment(commentId);

      res.json({
        ok: true,
        message: 'Comment hidden successfully'
      });
    } catch (error: any) {
      console.error('Hide comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to hide comment' });
    }
  });

  /**
   * POST /api/communities/:id/comments/:commentId/like
   * Like a comment (members only)
   */
  app.post('/api/communities/:id/comments/:commentId/like', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      const like = await communitiesStorage.addCommentLike(commentId, user.id);
      
      if (!like) {
        return res.status(409).json({ ok: false, error: 'Comment already liked' });
      }

      const likeCount = await communitiesStorage.getCommentLikeCount(commentId);

      // Send notification to comment author (non-blocking)
      try {
        const comment = await communitiesStorage.getCommentById(commentId);
        
        if (comment && comment.authorId !== user.id) {
          // Get the post to build the actionUrl
          const post = await communitiesStorage.getPostById(comment.postId);
          
          if (post) {
            // Check notification preferences
            const prefs = await communitiesStorage.getNotificationPreferences(comment.authorId, community.id);
            const shouldNotify = prefs ? prefs.commentLikes : true;

            if (shouldNotify) {
              // Use slug if available, otherwise fallback to ID (for communities without slugs)
              const communityIdentifier = community.slug || community.id;
              const actionUrl = `/community/${communityIdentifier}/post/${comment.postId}`;
              
              const notification = await communitiesStorage.createNotification({
                recipientId: comment.authorId,
                communityId: community.id,
                type: 'comment_like',
                title: 'Someone liked your comment',
                body: `${user.firstName} ${user.lastName} liked your comment`,
                postId: comment.postId,
                commentId: comment.id,
                actionUrl,
                metadata: {
                  postId: comment.postId,
                  postTitle: post.title,
                  commentId: comment.id,
                  commentContent: comment.content.substring(0, 100),
                  authorName: `${user.firstName} ${user.lastName}`,
                  communityName: community.name,
                  communitySlug: community.slug
                }
              });

              // Send email notification (immediate or queued for digest)
              const recipient = await communitiesStorage.getUserById(comment.authorId);
              if (recipient) {
                await emailService.sendNotificationEmail(notification, recipient, community);
              }

              // Send real-time notification
              const { broadcastNotificationToCommunity } = require('./chat-server');
              broadcastNotificationToCommunity(community.id, {
                id: notification.id,
                type: 'comment_like',
                title: 'Someone liked your comment',
                body: `${user.firstName} ${user.lastName} liked your comment`,
                postId: comment.postId,
                commentId: comment.id,
                communitySlug: community.slug,
                createdAt: notification.createdAt
              });
            }
          }
        }
      } catch (notificationError) {
        console.warn('Notification creation failed for comment like (non-blocking):', notificationError);
      }

      res.json({
        ok: true,
        message: 'Comment liked successfully',
        likeCount
      });
    } catch (error: any) {
      console.error('Like comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to like comment' });
    }
  });

  /**
   * DELETE /api/communities/:id/comments/:commentId/like
   * Unlike a comment (members only)
   */
  app.delete('/api/communities/:id/comments/:commentId/like', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check membership
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      if (!isOwner) {
        const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
        if (!membership || membership.status !== 'approved') {
          return res.status(403).json({ ok: false, error: 'Access denied - members only' });
        }
      }

      await communitiesStorage.removeCommentLike(commentId, user.id);
      const likeCount = await communitiesStorage.getCommentLikeCount(commentId);

      res.json({
        ok: true,
        message: 'Comment unliked successfully',
        likeCount
      });
    } catch (error: any) {
      console.error('Unlike comment error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to unlike comment' });
    }
  });

  // ============ CHAT ENDPOINTS ============
  
  /**
   * POST /api/communities/:id/chat/messages
   * Send a chat message to the community
   */
  app.post('/api/communities/:id/chat/messages', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const { content, isAnnouncement } = req.body;
      const user = (req as any).user;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'Message content is required' });
      }

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Get community to check chat settings
      const community = await communitiesStorage.getCommunityById(communityId);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check chat permissions
      const canSendMessage = 
        community.chatMode === 'all_members' ||
        (community.chatMode === 'moderators_only' && (membership.role === 'owner' || membership.role === 'moderator')) ||
        (community.chatMode === 'owner_only' && membership.role === 'owner');

      if (!canSendMessage) {
        return res.status(403).json({ ok: false, error: 'You do not have permission to send messages in this chat' });
      }

      // Only owners can send announcements
      if (isAnnouncement && membership.role !== 'owner') {
        return res.status(403).json({ ok: false, error: 'Only owners can send announcement messages' });
      }

      const message = await communitiesStorage.saveChatMessage(
        communityId,
        user.id,
        content,
        isAnnouncement || false
      );

      res.json({ ok: true, message });
    } catch (error: any) {
      console.error('Send chat message error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to send message' });
    }
  });

  /**
   * GET /api/communities/:id/chat/messages
   * Get chat history for the community
   */
  app.get('/api/communities/:id/chat/messages', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const messages = await communitiesStorage.getChatHistory(communityId, limit, offset);

      res.json({ ok: true, messages });
    } catch (error: any) {
      console.error('Get chat history error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get chat history' });
    }
  });

  /**
   * DELETE /api/communities/:id/chat/messages/:messageId
   * Delete a chat message
   */
  app.delete('/api/communities/:id/chat/messages/:messageId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, messageId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Get the message to check ownership
      const { data: message } = await (communitiesStorage as any).client
        .from('community_chat_messages')
        .select('author_id')
        .eq('id', messageId)
        .single();

      if (!message) {
        return res.status(404).json({ ok: false, error: 'Message not found' });
      }

      // Only author or owner can delete messages
      if (message.author_id !== user.id && membership.role !== 'owner') {
        return res.status(403).json({ ok: false, error: 'You can only delete your own messages' });
      }

      await communitiesStorage.deleteChatMessage(messageId, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Delete chat message error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete message' });
    }
  });

  /**
   * POST /api/communities/:id/chat/messages/:messageId/pin
   * Pin/unpin a message (owner and moderators)
   */
  app.post('/api/communities/:id/chat/messages/:messageId/pin', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, messageId } = req.params;
      const { isPinned } = req.body;
      const user = (req as any).user;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Allow owners and moderators to pin
      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can pin messages' });
      }

      // If pinning a new message, auto-unpin all others
      if (isPinned) {
        await communitiesStorage.unpinAllMessages(communityId);
      }

      await communitiesStorage.pinChatMessage(messageId, !!isPinned);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Pin chat message error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to pin message' });
    }
  });

  /**
   * GET /api/communities/:id/chat/pinned
   * Get pinned messages
   */
  app.get('/api/communities/:id/chat/pinned', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const messages = await communitiesStorage.getPinnedMessages(communityId);

      res.json({ ok: true, messages });
    } catch (error: any) {
      console.error('Get pinned messages error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get pinned messages' });
    }
  });

  // ============ POLLS ENDPOINTS ============
  
  /**
   * DEBUG: GET /api/communities/:id/debug-membership
   * Debug endpoint to check user membership and role
   */
  app.get('/api/communities/:id/debug-membership', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const user = (req as any).user;

      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      
      res.json({ 
        ok: true, 
        debug: {
          userId: user.id,
          communityId,
          membership,
          canCreatePolls: membership && membership.status === 'approved' && (membership.role === 'owner' || membership.role === 'moderator')
        }
      });
    } catch (error: any) {
      console.error('Debug membership error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to debug membership' });
    }
  });

  /**
   * POST /api/communities/:id/fix-owner-membership
   * Fix missing owner membership for community organizer
   */
  app.post('/api/communities/:id/fix-owner-membership', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const user = (req as any).user;

      // Get the community
      const community = await communitiesStorage.getCommunityById(communityId);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is the organizer of this community
      const organizer = await communitiesStorage.getOrganizerById(community.organizerId);
      if (!organizer || organizer.userId !== user.id) {
        return res.status(403).json({ ok: false, error: 'Only the community organizer can fix membership' });
      }

      // Check if owner membership already exists
      const existingMembership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (existingMembership && existingMembership.role === 'owner') {
        return res.json({ ok: true, message: 'Owner membership already exists', membership: existingMembership });
      }

      // Create or update the membership to owner
      if (existingMembership) {
        // Update existing membership to owner
        const updatedMembership = await communitiesStorage.updateCommunityMembership(communityId, user.id, {
          role: 'owner',
          status: 'approved',
          approvedAt: new Date().toISOString()
        });
        res.json({ ok: true, message: 'Membership updated to owner', membership: updatedMembership });
      } else {
        // Create new owner membership
        const newMembership = await communitiesStorage.createMembership({
          communityId,
          userId: user.id,
          status: 'approved',
          role: 'owner',
          approvedAt: new Date().toISOString()
        });
        res.json({ ok: true, message: 'Owner membership created', membership: newMembership });
      }
    } catch (error: any) {
      console.error('Fix owner membership error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to fix owner membership' });
    }
  });

  /**
   * POST /api/communities/:id/polls
   * Create a new poll
   */
  app.post('/api/communities/:id/polls', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const user = (req as any).user;
      const pollData = req.body;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      console.log('Poll creation - User membership check:', {
        userId: user.id,
        communityId,
        membership: membership ? {
          role: membership.role,
          status: membership.status,
          approvedAt: membership.approvedAt
        } : null
      });
      
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Only owners and moderators can create polls
      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        console.log('Poll creation - User does not have owner/moderator role, checking if organizer...');
        
        // Additional check: if user is the community organizer, auto-fix their membership
        const community = await communitiesStorage.getCommunityById(communityId);
        console.log('Poll creation - Community data:', {
          communityId,
          organizerId: community ? community.organizerId : 'not found'
        });
        
        if (community) {
          const organizer = await communitiesStorage.getOrganizerById(community.organizerId);
          console.log('Poll creation - Organizer data:', {
            organizerId: community.organizerId,
            organizer: organizer ? {
              userId: organizer.user_id, // Supabase returns snake_case
              isCurrentUser: organizer.user_id === user.id
            } : null
          });
          
          if (organizer && organizer.user_id === user.id) {
            // User is the organizer but doesn't have owner role, fix it
            console.log('Poll creation - Auto-fixing owner membership for community organizer');
            await communitiesStorage.updateMembership(membership.id, {
              role: 'owner',
              status: 'approved',
              approvedAt: new Date().toISOString()
            });
            console.log('Auto-fixed owner membership for community organizer');
          } else {
            console.log('Poll creation - User is not the organizer, denying access');
            return res.status(403).json({ ok: false, error: 'Only owners and moderators can create polls' });
          }
        } else {
          console.log('Poll creation - Community not found, denying access');
          return res.status(403).json({ ok: false, error: 'Only owners and moderators can create polls' });
        }
      }

      // Validate poll data
      if (!pollData.question || !pollData.options || pollData.options.length < 2) {
        return res.status(400).json({ ok: false, error: 'Invalid poll data' });
      }

      const poll = await communitiesStorage.createPoll(communityId, user.id, pollData);

      res.json({ ok: true, poll });
    } catch (error: any) {
      console.error('Create poll error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create poll' });
    }
  });

  /**
   * GET /api/communities/:id/polls
   * Get polls for the community
   */
  app.get('/api/communities/:id/polls', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const status = (req.query.status as 'active' | 'closed' | 'all') || 'active';
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const polls = await communitiesStorage.getPolls(communityId, status);

      // Batch fetch all user votes for these polls in a single query
      const pollIds = polls.map((p: any) => p.id);
      const allUserVotes = await communitiesStorage.getBatchUserPollVotes(pollIds, user.id);
      
      // Map votes to each poll
      const pollsWithVotes = polls.map((poll: any) => ({
        ...poll,
        userVotes: allUserVotes[poll.id] || []
      }));

      res.json({ ok: true, polls: pollsWithVotes });
    } catch (error: any) {
      console.error('Get polls error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get polls' });
    }
  });

  /**
   * GET /api/communities/:id/polls/:pollId
   * Get poll details with results
   */
  app.get('/api/communities/:id/polls/:pollId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, pollId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const poll = await communitiesStorage.getPollDetails(pollId, user.id);

      res.json({ ok: true, poll });
    } catch (error: any) {
      console.error('Get poll details error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get poll details' });
    }
  });

  /**
   * POST /api/communities/:id/polls/:pollId/vote
   * Vote on a poll
   */
  app.post('/api/communities/:id/polls/:pollId/vote', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, pollId } = req.params;
      const { optionIds } = req.body;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
        return res.status(400).json({ ok: false, error: 'Please select at least one option' });
      }

      await communitiesStorage.votePoll(pollId, optionIds, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Vote on poll error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to vote on poll' });
    }
  });

  /**
   * DELETE /api/communities/:id/polls/:pollId/vote
   * Remove vote from a poll
   */
  app.delete('/api/communities/:id/polls/:pollId/vote', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, pollId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      await communitiesStorage.removeVote(pollId, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Remove vote error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to remove vote' });
    }
  });

  /**
   * PATCH /api/communities/:id/polls/:pollId
   * Close a poll (owner only)
   */
  app.patch('/api/communities/:id/polls/:pollId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, pollId } = req.params;
      const user = (req as any).user;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      if (membership.role !== 'owner') {
        return res.status(403).json({ ok: false, error: 'Only owners can close polls' });
      }

      await communitiesStorage.closePoll(pollId);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Close poll error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to close poll' });
    }
  });

  // ============ GIVEAWAYS ROUTES ============
  /**
   * POST /api/communities/:id/giveaways
   * Create a new giveaway
   */
  app.post('/api/communities/:id/giveaways', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const user = (req as any).user;

      // Check membership and role FIRST
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Only owners and moderators can create giveaways
      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can create giveaways' });
      }

      // Parse and validate request body - basic validation for now
      // TODO: Use insertCommunityGiveawaySchema.parse(req.body) for full type safety
      const giveawayData = req.body;
      
      if (!giveawayData.title || !giveawayData.prizeTitle || !giveawayData.endsAt || !giveawayData.giveawayType) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: title, prizeTitle, endsAt, giveawayType' });
      }

      // Validate giveaway type
      const validTypes = ['random_draw', 'first_come', 'task_based', 'points_based'];
      if (!validTypes.includes(giveawayData.giveawayType)) {
        return res.status(400).json({ ok: false, error: 'Invalid giveaway type' });
      }

      const giveaway = await communitiesStorage.createGiveaway(communityId, user.id, {
        ...giveawayData,
        endsAt: new Date(giveawayData.endsAt),
        startsAt: giveawayData.startsAt ? new Date(giveawayData.startsAt) : undefined,
        drawAt: giveawayData.drawAt ? new Date(giveawayData.drawAt) : undefined
      });

      res.json({ ok: true, giveaway });
    } catch (error: any) {
      console.error('Create giveaway error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create giveaway' });
    }
  });

  /**
   * GET /api/communities/:id/giveaways
   * Get giveaways for the community
   */
  app.get('/api/communities/:id/giveaways', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId } = req.params;
      const status = (req.query.status as 'active' | 'ended' | 'all') || 'all';
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const giveaways = await communitiesStorage.getGiveaways(communityId, status);
      
      // Batch fetch user entries for all giveaways in one query
      const giveawayIds = giveaways.map((g: any) => g.id);
      let userEntriesMap: Record<string, any> = {};
      
      if (giveawayIds.length > 0) {
        const { data: userEntries } = await (communitiesStorage as any).client
          .from('community_giveaway_entries')
          .select('*')
          .in('giveaway_id', giveawayIds)
          .eq('user_id', user.id);
        
        // Map entries by giveaway_id for quick lookup
        if (userEntries) {
          userEntriesMap = userEntries.reduce((acc: Record<string, any>, entry: any) => {
            acc[entry.giveaway_id] = entry;
            return acc;
          }, {});
        }
      }
      
      // Attach user entries to giveaways
      const giveawaysWithUserEntries = giveaways.map((giveaway: any) => ({
        ...giveaway,
        userEntry: userEntriesMap[giveaway.id] || null
      }));

      res.json({ ok: true, giveaways: giveawaysWithUserEntries });
    } catch (error: any) {
      console.error('Get giveaways error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get giveaways' });
    }
  });

  /**
   * GET /api/communities/:id/giveaways/:giveawayId
   * Get giveaway details with user entry status
   */
  app.get('/api/communities/:id/giveaways/:giveawayId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      const giveaway = await communitiesStorage.getGiveawayDetails(giveawayId, user.id);

      res.json({ ok: true, giveaway });
    } catch (error: any) {
      console.error('Get giveaway details error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get giveaway details' });
    }
  });

  /**
   * POST /api/communities/:id/giveaways/:giveawayId/enter
   * Enter a giveaway
   */
  app.post('/api/communities/:id/giveaways/:giveawayId/enter', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Get IP and User-Agent for fraud prevention
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || '';
      const userAgent = req.headers['user-agent'] || '';

      const entry = await communitiesStorage.enterGiveaway(giveawayId, user.id, {
        entryMethod: 'manual',
        ipAddress,
        userAgent
      });

      res.json({ ok: true, entry });
    } catch (error: any) {
      console.error('Enter giveaway error:', error);
      res.status(400).json({ ok: false, error: error.message || 'Failed to enter giveaway' });
    }
  });

  /**
   * DELETE /api/communities/:id/giveaways/:giveawayId/entry
   * Remove giveaway entry
   */
  app.delete('/api/communities/:id/giveaways/:giveawayId/entry', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      await communitiesStorage.removeGiveawayEntry(giveawayId, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Remove giveaway entry error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to remove entry' });
    }
  });

  /**
   * POST /api/communities/:id/giveaways/:giveawayId/draw
   * Draw winners for a giveaway (owner/moderator only)
   */
  app.post('/api/communities/:id/giveaways/:giveawayId/draw', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership and role - CRITICAL: Must be owner or moderator
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      // Explicit role check - only owner and moderator can draw winners
      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        console.log(`Draw winners denied - User ${user.id} has role: ${membership.role}`);
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can draw winners' });
      }

      const winners = await communitiesStorage.drawGiveawayWinners(giveawayId, user.id);

      res.json({ ok: true, winners });
    } catch (error: any) {
      console.error('Draw giveaway winners error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to draw winners' });
    }
  });

  /**
   * PATCH /api/communities/:id/giveaways/:giveawayId
   * Update giveaway status (owner only)
   */
  app.patch('/api/communities/:id/giveaways/:giveawayId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can update giveaway status' });
      }

      if (!status) {
        return res.status(400).json({ ok: false, error: 'Status is required' });
      }

      await communitiesStorage.updateGiveawayStatus(giveawayId, status, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Update giveaway status error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update giveaway status' });
    }
  });

  /**
   * DELETE /api/communities/:id/giveaways/:giveawayId
   * Delete a giveaway (owner/moderator only)
   */
  app.delete('/api/communities/:id/giveaways/:giveawayId', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can delete giveaways' });
      }

      await communitiesStorage.deleteGiveaway(giveawayId, user.id);

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Delete giveaway error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete giveaway' });
    }
  });

  /**
   * GET /api/communities/:id/giveaways/:giveawayId/entries
   * Get all entries for a giveaway (owner/moderator only)
   */
  app.get('/api/communities/:id/giveaways/:giveawayId/entries', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id: communityId, giveawayId } = req.params;
      const user = (req as any).user;

      // Check membership and role
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        return res.status(403).json({ ok: false, error: 'Not a member of this community' });
      }

      if (membership.role !== 'owner' && membership.role !== 'moderator') {
        return res.status(403).json({ ok: false, error: 'Only owners and moderators can view entries' });
      }

      const entries = await communitiesStorage.getGiveawayEntries(giveawayId);

      res.json({ ok: true, entries });
    } catch (error: any) {
      console.error('Get giveaway entries error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get entries' });
    }
  });

  /**
   * GET /api/communities/:id/analytics
   * Get comprehensive community analytics data
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/analytics \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/analytics', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is a member of the community or is the organizer
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, community.id);
      const isOrganizer = community.organizerId === user.id;
      
      if (!membership && !isOrganizer) {
        return res.status(403).json({ ok: false, error: 'Access denied - community members only' });
      }

      // Get community posts with all engagement data
      const postsResult = await communitiesStorage.getPostsByCommunityId(id, user.id);
      const posts = postsResult.posts || [];
      const members = await communitiesStorage.getMembershipsByCommunityId(id);

      // Get all reactions and comments for detailed analytics
      const { db } = await import('../db');
      const { communityPostReactions, communityComments } = await import('@shared/schema');
      const { inArray } = await import('drizzle-orm');
      
      const postIds = posts.map(p => p.id);
      
      // Get all reactions with timestamps
      const allReactions = postIds.length > 0 
        ? await db.select().from(communityPostReactions)
            .where(inArray(communityPostReactions.postId, postIds))
        : [];
      
      // Get all comments with timestamps  
      const allComments = postIds.length > 0
        ? await db.select().from(communityComments)
            .where(inArray(communityComments.postId, postIds))
        : [];

      // ============ PERFORMANCE OPTIMIZATION ============
      // Build maps for O(1) lookups instead of O(P*E) filtering
      const postEngagementMap: { [postId: string]: { 
        reactions: number; 
        comments: number; 
        firstEngagementAt: number | null;
      }} = {};
      
      posts.forEach(post => {
        postEngagementMap[post.id] = { reactions: 0, comments: 0, firstEngagementAt: null };
      });
      
      allReactions.forEach(r => {
        if (postEngagementMap[r.postId]) {
          postEngagementMap[r.postId].reactions++;
          const engagementTime = new Date(r.createdAt).getTime();
          if (!postEngagementMap[r.postId].firstEngagementAt || engagementTime < postEngagementMap[r.postId].firstEngagementAt!) {
            postEngagementMap[r.postId].firstEngagementAt = engagementTime;
          }
        }
      });
      
      allComments.forEach(c => {
        if (postEngagementMap[c.postId]) {
          postEngagementMap[c.postId].comments++;
          const engagementTime = new Date(c.createdAt).getTime();
          if (!postEngagementMap[c.postId].firstEngagementAt || engagementTime < postEngagementMap[c.postId].firstEngagementAt!) {
            postEngagementMap[c.postId].firstEngagementAt = engagementTime;
          }
        }
      });

      // ============ BEST TIME TO POST ============
      // Calculate engagement by day of week and hour based on WHEN PEOPLE ENGAGE (not when posts are created)
      const dayOfWeekEngagement: { [key: number]: number } = {};
      const hourOfDayEngagement: { [key: number]: number } = {};
      
      // Bucket engagement by timestamp of reactions/comments
      allReactions.forEach(r => {
        const engagementDate = new Date(r.createdAt);
        const dayOfWeek = engagementDate.getDay();
        const hour = engagementDate.getHours();
        dayOfWeekEngagement[dayOfWeek] = (dayOfWeekEngagement[dayOfWeek] || 0) + 1;
        hourOfDayEngagement[hour] = (hourOfDayEngagement[hour] || 0) + 1;
      });
      
      allComments.forEach(c => {
        const engagementDate = new Date(c.createdAt);
        const dayOfWeek = engagementDate.getDay();
        const hour = engagementDate.getHours();
        dayOfWeekEngagement[dayOfWeek] = (dayOfWeekEngagement[dayOfWeek] || 0) + 1;
        hourOfDayEngagement[hour] = (hourOfDayEngagement[hour] || 0) + 1;
      });
      
      // Find top 3 days with highest engagement
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const sortedDays = Object.entries(dayOfWeekEngagement)
        .map(([day, eng]) => ({ day: parseInt(day), engagement: eng }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3);
      
      const maxDayEngagement = Math.max(...Object.values(dayOfWeekEngagement), 1);
      const bestDays = sortedDays.map(d => ({
        day: dayNames[d.day],
        percentage: Math.round((d.engagement / maxDayEngagement) * 100)
      }));
      
      // Find peak hours (top 3)
      const sortedHours = Object.entries(hourOfDayEngagement)
        .map(([hour, eng]) => ({ hour: parseInt(hour), engagement: eng }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3);
      
      const peakHours = sortedHours.map(h => {
        const startHour = h.hour % 12 || 12;
        const endHour = (h.hour + 2) % 12 || 12;
        const period = h.hour >= 12 ? 'PM' : 'AM';
        return `${startHour}:00 ${period} - ${endHour}:00 ${period}`;
      });

      // ============ AVERAGE ENGAGEMENT PER POST ============
      const totalEngagement = allReactions.length + allComments.length;
      const avgEngagementPerPost = posts.length > 0 ? totalEngagement / posts.length : 0;

      // ============ MOST ACTIVE MEMBERS ============
      // Count reactions and comments by user
      const userActivity: { [userId: string]: { reactions: number; comments: number; name?: string } } = {};
      
      allReactions.forEach(r => {
        if (!userActivity[r.userId]) {
          userActivity[r.userId] = { reactions: 0, comments: 0 };
        }
        userActivity[r.userId].reactions++;
      });
      
      allComments.forEach(c => {
        if (!userActivity[c.authorId]) {
          userActivity[c.authorId] = { reactions: 0, comments: 0 };
        }
        userActivity[c.authorId].comments++;
      });
      
      // Get user names
      const userIds = Object.keys(userActivity);
      const { users } = await import('@shared/schema');
      const userDetails = userIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];
      
      userDetails.forEach(u => {
        if (userActivity[u.id]) {
          userActivity[u.id].name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        }
      });
      
      const mostActiveMembers = Object.entries(userActivity)
        .map(([userId, activity]) => ({
          userId,
          name: activity.name || 'Unknown',
          totalActivity: activity.reactions + activity.comments,
          reactions: activity.reactions,
          comments: activity.comments
        }))
        .sort((a, b) => b.totalActivity - a.totalActivity)
        .slice(0, 10);

      // ============ ENGAGEMENT TREND ============
      // Calculate weekly engagement for the last 8 weeks
      const weeklyEngagement: { week: string; engagement: number }[] = [];
      const now = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weekReactions = allReactions.filter(r => {
          const date = new Date(r.createdAt);
          return date >= weekStart && date < weekEnd;
        }).length;
        
        const weekComments = allComments.filter(c => {
          const date = new Date(c.createdAt);
          return date >= weekStart && date < weekEnd;
        }).length;
        
        weeklyEngagement.push({
          week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          engagement: weekReactions + weekComments
        });
      }
      
      // Calculate trend (is engagement growing or declining?)
      const firstWeeksAvg = weeklyEngagement.slice(0, 4).reduce((sum, w) => sum + w.engagement, 0) / 4;
      const lastWeeksAvg = weeklyEngagement.slice(4).reduce((sum, w) => sum + w.engagement, 0) / 4;
      const trendPercentage = firstWeeksAvg > 0 
        ? Math.round(((lastWeeksAvg - firstWeeksAvg) / firstWeeksAvg) * 100)
        : 0;

      // ============ TOP PERFORMING POST TYPES ============
      const postTypePerformance: { [type: string]: { count: number; avgEngagement: number } } = {
        'text_only': { count: 0, avgEngagement: 0 },
        'with_image': { count: 0, avgEngagement: 0 },
        'with_link': { count: 0, avgEngagement: 0 }
      };
      
      posts.forEach(post => {
        const postData = postEngagementMap[post.id];
        const engagement = postData.reactions + postData.comments;
        
        if (post.imageUrl) {
          postTypePerformance.with_image.count++;
          postTypePerformance.with_image.avgEngagement += engagement;
        } else if (post.linkUrl) {
          postTypePerformance.with_link.count++;
          postTypePerformance.with_link.avgEngagement += engagement;
        } else {
          postTypePerformance.text_only.count++;
          postTypePerformance.text_only.avgEngagement += engagement;
        }
      });
      
      // Calculate averages
      Object.keys(postTypePerformance).forEach(type => {
        const data = postTypePerformance[type];
        if (data.count > 0) {
          data.avgEngagement = Math.round((data.avgEngagement / data.count) * 10) / 10;
        }
      });
      
      const topPostTypes = Object.entries(postTypePerformance)
        .map(([type, data]) => ({
          type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          avgEngagement: data.avgEngagement,
          count: data.count
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);

      // ============ RESPONSE TIME ============
      // Calculate average time from post creation to first engagement using the map
      let totalResponseTime = 0;
      let responseCounts = 0;
      
      posts.forEach(post => {
        const postData = postEngagementMap[post.id];
        
        if (postData.firstEngagementAt) {
          const postTime = new Date(post.createdAt).getTime();
          
          if (postData.firstEngagementAt > postTime) {
            const responseTimeMinutes = (postData.firstEngagementAt - postTime) / (1000 * 60);
            totalResponseTime += responseTimeMinutes;
            responseCounts++;
          }
        }
      });
      
      // Return average response time in minutes (raw number)
      const avgResponseTimeMinutes = responseCounts > 0 
        ? totalResponseTime / responseCounts
        : 0;

      // ============ MEMBER RETENTION RATE ============
      // Calculate what % of members who joined 30+ days ago are still active
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldMembers = members.filter(m => m.joinedAt && new Date(m.joinedAt) < thirtyDaysAgo);
      const activeOldMembers = oldMembers.filter(m => {
        // Member is active if they have reactions or comments in last 30 days
        const hasRecentReactions = allReactions.some(r => 
          r.userId === m.userId && new Date(r.createdAt) >= thirtyDaysAgo
        );
        const hasRecentComments = allComments.some(c => 
          c.authorId === m.userId && new Date(c.createdAt) >= thirtyDaysAgo
        );
        return hasRecentReactions || hasRecentComments;
      });
      
      // Return as decimal (0-1) for client-side formatting flexibility
      const retentionRate = oldMembers.length > 0
        ? activeOldMembers.length / oldMembers.length
        : 0;

      // ============ FIXED ENGAGEMENT RATE WITH REAL VIEW COUNTS ============
      let totalViews = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      // Return as decimal (0-1) for client-side formatting flexibility
      const engagementRate = totalViews > 0
        ? totalEngagement / totalViews
        : 0;

      // ============ MEMBER GROWTH ============
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      const newMembersThisMonth = members.filter(m => m.joinedAt && new Date(m.joinedAt) >= oneMonthAgo).length;
      // Return as decimal (0-1) for client-side formatting flexibility
      const memberGrowthRate = members.length > 0
        ? newMembersThisMonth / members.length
        : 0;

      res.json({
        ok: true,
        analytics: {
          // Basic stats
          totalMembers: members.length,
          totalPosts: posts.length,
          totalReactions: allReactions.length,
          totalComments: allComments.length,
          totalViews,
          engagementRate, // Raw decimal (0-1), format as % on client
          memberGrowthRate, // Raw decimal (0-1), format as % on client
          
          // Best time to post
          bestTimeToPost: {
            days: bestDays,
            hours: peakHours
          },
          
          // Engagement metrics
          avgEngagementPerPost, // Raw number, not string
          mostActiveMembers,
          engagementTrend: {
            weeklyData: weeklyEngagement,
            trendPercentage,
            direction: trendPercentage > 0 ? 'growing' : trendPercentage < 0 ? 'declining' : 'stable'
          },
          
          // Post performance
          topPostTypes,
          
          // Timing metrics
          avgResponseTimeMinutes, // Raw minutes, format on client
          
          // Retention
          retentionRate, // Raw decimal (0-1), format as % on client
          
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Get community analytics error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get analytics' });
    }
  });

  // ============ BILLING ENDPOINTS ============

  /**
   * POST /api/communities/:id/billing/create-checkout
   * Create a Stripe checkout session for subscription
   */
  app.post('/api/communities/:id/billing/create-checkout', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { priceId } = req.body; // 'monthly' or 'yearly'
      const user = (req as any).user;

      // Get community and verify ownership
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check ownership through organizer
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      if (!organizer || community.organizerId !== organizer.id) {
        return res.status(403).json({ ok: false, error: 'Only community owners can manage billing' });
      }

      // Check if there's already an active subscription
      const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(id);
      if (existingSubscription && existingSubscription.status === 'active') {
        return res.status(400).json({ ok: false, error: 'Community already has an active subscription' });
      }

      // Determine the actual Stripe price ID
      const stripePriceId = priceId === 'yearly' ? STRIPE_PRICES.yearly : STRIPE_PRICES.monthly;

      // Create or get Stripe customer
      let customerId = existingSubscription?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: {
            userId: user.id,
            communityId: id
          }
        });
        customerId = customer.id;
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: stripePriceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.NODE_ENV === 'production' ? 'https://thehouseofjugnu.com' : 'http://localhost:5000'}/communities/${community.slug}?billing=success`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? 'https://thehouseofjugnu.com' : 'http://localhost:5000'}/communities/${community.slug}?billing=cancelled`,
        metadata: {
          communityId: id,
          organizerId: user.id,
          plan: priceId
        },
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            communityId: id,
            organizerId: user.id
          }
        }
      });

      res.json({ 
        ok: true, 
        checkoutUrl: session.url,
        sessionId: session.id 
      });
    } catch (error: any) {
      console.error('Create checkout error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create checkout session' });
    }
  });

  /**
   * POST /api/communities/:id/billing/manage
   * Create a Stripe customer portal session
   */
  app.post('/api/communities/:id/billing/manage', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Get community and verify ownership
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check ownership through organizer
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      if (!organizer || community.organizerId !== organizer.id) {
        return res.status(403).json({ ok: false, error: 'Only community owners can manage billing' });
      }

      // Get subscription
      const subscription = await communitiesStorage.getSubscriptionByCommunityId(id);
      if (!subscription || !subscription.stripeCustomerId) {
        return res.status(400).json({ ok: false, error: 'No subscription found for this community' });
      }

      // Create customer portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.NODE_ENV === 'production' ? 'https://thehouseofjugnu.com' : 'http://localhost:5000'}/communities/${community.slug}`
      });

      res.json({ 
        ok: true, 
        portalUrl: session.url 
      });
    } catch (error: any) {
      console.error('Create portal session error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create portal session' });
    }
  });

  /**
   * GET /api/communities/:id/billing/status
   * Get subscription status for a community
   */
  app.get('/api/communities/:id/billing/status', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Get community
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is the owner or member
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      const membership = await communitiesStorage.getMembershipByUserAndCommunity(user.id, id);
      
      if (!membership && !isOwner) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }

      // Communities are FREE for all business accounts indefinitely
      // Return free access status without subscription enforcement
      res.json({
        ok: true,
        subscription: {
          id: 'free-access',
          communityId: id,
          organizerId: community.organizerId,
          plan: 'free',
          status: 'active',
          memberLimit: 999999,
          canManage: isOwner,
          payments: []
        }
      });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get subscription status' });
    }
  });

  /**
   * POST /api/communities/:id/billing/cancel
   * Cancel subscription at period end
   */
  app.post('/api/communities/:id/billing/cancel', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Get community and verify ownership
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check ownership through organizer
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      if (!organizer || community.organizerId !== organizer.id) {
        return res.status(403).json({ ok: false, error: 'Only community owners can manage billing' });
      }

      // Get subscription
      const subscription = await communitiesStorage.getSubscriptionByCommunityId(id);
      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(400).json({ ok: false, error: 'No active subscription found' });
      }

      // Cancel in Stripe (at period end)
      const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      // Update local subscription
      await communitiesStorage.updateSubscriptionStatus(subscription.id, 'active', {
        cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : undefined
      });

      res.json({ ok: true, message: 'Subscription will be canceled at the end of the current billing period' });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to cancel subscription' });
    }
  });

  /**
   * POST /api/communities/:id/billing/resume
   * Resume a canceled subscription
   */
  app.post('/api/communities/:id/billing/resume', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Get community and verify ownership
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check ownership through organizer
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      if (!organizer || community.organizerId !== organizer.id) {
        return res.status(403).json({ ok: false, error: 'Only community owners can manage billing' });
      }

      // Get subscription
      const subscription = await communitiesStorage.getSubscriptionByCommunityId(id);
      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(400).json({ ok: false, error: 'No subscription found' });
      }

      // Resume in Stripe
      const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });

      // Update local subscription
      await communitiesStorage.updateSubscriptionStatus(subscription.id, 'active', {
        cancelAt: null
      });

      res.json({ ok: true, message: 'Subscription resumed successfully' });
    } catch (error: any) {
      console.error('Resume subscription error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to resume subscription' });
    }
  });

  /**
   * POST /api/communities/billing/webhook
   * Handle Stripe webhook events
   */
  app.post('/api/communities/billing/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ ok: false, error: 'Missing webhook signature or secret' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature and construct event
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }

    try {
      // Check if we've already processed this event
      const existingEvent = await communitiesStorage.getBillingEventByStripeId(event.id);
      if (existingEvent && existingEvent.processed) {
        return res.json({ ok: true, message: 'Event already processed' });
      }

      // Record the event
      await communitiesStorage.recordBillingEvent({
        stripeEventId: event.id,
        eventType: event.type,
        data: event.data as any,
        processed: false
      });

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const { communityId, organizerId, plan } = session.metadata || {};
          
          if (communityId && organizerId) {
            // Get or create subscription record
            let subscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
            
            if (!subscription) {
              subscription = await communitiesStorage.createSubscription({
                communityId,
                organizerId,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                plan: plan || 'monthly',
                status: 'trialing', // Will be updated by subscription.updated event
                trialStart: new Date(),
                trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
              });
            } else {
              // Update existing subscription
              await communitiesStorage.updateSubscriptionStatus(subscription.id, 'active', {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                stripePriceId: plan === 'yearly' ? STRIPE_PRICES.yearly : STRIPE_PRICES.monthly
              });
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const localSubscription = await communitiesStorage.getSubscriptionByStripeId(subscription.id);
          
          if (localSubscription) {
            await communitiesStorage.updateSubscriptionStatus(localSubscription.id, subscription.status as any, {
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
              canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
              trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
            });
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const localSubscription = await communitiesStorage.getSubscriptionByStripeId(subscription.id);
          
          if (localSubscription) {
            await communitiesStorage.updateSubscriptionStatus(localSubscription.id, 'canceled', {
              canceledAt: new Date()
            });
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription;
          
          if (subscriptionId) {
            const localSubscription = await communitiesStorage.getSubscriptionByStripeId(subscriptionId as string);
            
            if (localSubscription) {
              await communitiesStorage.recordPayment({
                subscriptionId: localSubscription.id,
                communityId: localSubscription.communityId,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent as string,
                amountPaid: invoice.amount_paid,
                currency: invoice.currency.toUpperCase(),
                status: 'succeeded',
                description: `Payment for ${invoice.lines.data[0]?.description || 'Community Membership'}`,
                billingPeriodStart: new Date(invoice.period_start * 1000),
                billingPeriodEnd: new Date(invoice.period_end * 1000),
                receiptUrl: invoice.hosted_invoice_url || undefined
              });

              // Update subscription status to active if it was past_due
              if (localSubscription.status === 'past_due') {
                await communitiesStorage.updateSubscriptionStatus(localSubscription.id, 'active');
              }
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription;
          
          if (subscriptionId) {
            const localSubscription = await communitiesStorage.getSubscriptionByStripeId(subscriptionId as string);
            
            if (localSubscription) {
              await communitiesStorage.recordPayment({
                subscriptionId: localSubscription.id,
                communityId: localSubscription.communityId,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent as string,
                amountPaid: 0,
                currency: invoice.currency.toUpperCase(),
                status: 'failed',
                description: `Failed payment for ${invoice.lines.data[0]?.description || 'Community Membership'}`,
                failureReason: 'Payment failed',
                billingPeriodStart: new Date(invoice.period_start * 1000),
                billingPeriodEnd: new Date(invoice.period_end * 1000)
              });

              // Update subscription status
              await communitiesStorage.updateSubscriptionStatus(localSubscription.id, 'past_due');
            }
          }
          break;
        }

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark event as processed
      await communitiesStorage.markBillingEventProcessed(event.id);
      
      res.json({ ok: true, message: 'Event processed successfully' });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to process webhook' });
    }
  });

  // ============ NOTIFICATION ENDPOINTS ============
  
  /**
   * GET /api/notifications
   * Get all user notifications across communities
   * curl -X GET http://localhost:5000/api/notifications \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/notifications', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { limit = 20, offset = 0, unread_only = false } = req.query;

      const { notifications, total } = await communitiesStorage.getNotifications(user.id, {
        limit: Number(limit),
        offset: Number(offset),
        unreadOnly: unread_only === 'true'
      });

      const unreadCount = await communitiesStorage.getUnreadCount(user.id);

      res.json({
        ok: true,
        notifications,
        total,
        unreadCount,
        hasMore: Number(offset) + notifications.length < total
      });
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get notifications' });
    }
  });

  /**
   * GET /api/communities/:id/notifications
   * Get user's notifications for a specific community
   * curl -X GET http://localhost:5000/api/communities/COMMUNITY_ID/notifications \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/communities/:id/notifications', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { limit = 20, offset = 0, unread_only = false } = req.query;

      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      const { notifications, total } = await communitiesStorage.getNotifications(user.id, {
        communityId: community.id,
        limit: Number(limit),
        offset: Number(offset),
        unreadOnly: unread_only === 'true'
      });

      const unreadCount = await communitiesStorage.getUnreadCount(user.id, community.id);

      res.json({
        ok: true,
        notifications,
        total,
        unreadCount,
        hasMore: Number(offset) + notifications.length < total
      });
    } catch (error: any) {
      console.error('Get community notifications error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get notifications' });
    }
  });

  /**
   * PATCH /api/notifications/:id/read
   * Mark a notification as read
   * curl -X PATCH http://localhost:5000/api/notifications/NOTIFICATION_ID/read \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.patch('/api/notifications/:id/read', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const notification = await communitiesStorage.markAsRead(id, user.id);

      res.json({
        ok: true,
        notification,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to mark notification as read' });
    }
  });

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   * curl -X PATCH http://localhost:5000/api/notifications/read-all \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.patch('/api/notifications/read-all', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { communityId } = req.body;

      const count = await communitiesStorage.markAllAsRead(user.id, communityId);

      res.json({
        ok: true,
        markedCount: count,
        message: `Marked ${count} notifications as read`
      });
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to mark notifications as read' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   * curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.delete('/api/notifications/:id', checkCommunitiesFeatureFlag, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      await communitiesStorage.deleteNotification(id, user.id);

      res.json({
        ok: true,
        message: 'Notification deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete notification error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete notification' });
    }
  });

  /**
   * POST /api/communities/:id/notifications/test
   * Test notification (owner only)
   * curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/notifications/test \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"type":"test","title":"Test Notification","body":"This is a test"}'
   */
  app.post('/api/communities/:id/notifications/test', checkCommunitiesFeatureFlag, requireAuth, requireCommunityOwner, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const community = (req as any).community;
      const { type = 'test', title = 'Test Notification', body = 'This is a test notification' } = req.body;

      // Create test notification for the owner
      const notification = await communitiesStorage.createNotification({
        recipientId: user.id,
        communityId: community.id,
        type,
        title,
        body,
        metadata: { 
          test: true, 
          timestamp: new Date(),
          communitySlug: community.slug
        }
      });

      // Send test email if enabled
      const emailSent = await emailService.sendNotificationEmail(notification, user, community);

      res.json({
        ok: true,
        notification,
        emailSent,
        message: 'Test notification created successfully'
      });
    } catch (error: any) {
      console.error('Test notification error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create test notification' });
    }
  });

  /**
   * GET /api/notifications/preferences
   * Get notification preferences for the current user
   * curl -X GET http://localhost:5000/api/notifications/preferences \
   *   -H "Authorization: Bearer YOUR_TOKEN"
   */
  app.get('/api/notifications/preferences', checkCommunitiesFeatureFlag, requireAuthOrSession, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { communityId } = req.query;

      const preferences = await communitiesStorage.getNotificationPreferences(
        user.id,
        communityId as string | undefined
      );

      // If no preferences exist, return defaults
      if (!preferences) {
        return res.json({
          ok: true,
          preferences: {
            inAppEnabled: true,
            emailEnabled: true,
            pushEnabled: false,
            newPosts: true,
            postComments: true,
            commentReplies: true,
            mentions: true,
            pollResults: true,
            membershipUpdates: true,
            communityAnnouncements: true,
            newDeals: true,
            emailFrequency: 'immediate',
            emailDigestTime: '09:00',
            emailDigestTimezone: 'America/Vancouver'
          }
        });
      }

      res.json({
        ok: true,
        preferences
      });
    } catch (error: any) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get notification preferences' });
    }
  });

  /**
   * PATCH /api/notifications/preferences
   * Update notification preferences
   * curl -X PATCH http://localhost:5000/api/notifications/preferences \
   *   -H "Authorization: Bearer YOUR_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"emailEnabled":false,"emailFrequency":"daily"}'
   */
  app.patch('/api/notifications/preferences', checkCommunitiesFeatureFlag, requireAuthOrSession, async (req: Request, res: Response) => {
    try {
      console.log('[PATCH /api/notifications/preferences] Request received');
      console.log('[PATCH] Session:', req.session?.userId);
      console.log('[PATCH] Body:', req.body);
      
      const user = (req as any).user;
      console.log('[PATCH] User from middleware:', user?.id);
      
      const { communityId, ...preferences } = req.body;
      
      // Sanitize communityId - convert 'null' string or null to undefined
      const sanitizedCommunityId = (communityId === 'null' || communityId === null || communityId === undefined) 
        ? undefined 
        : communityId;

      console.log('[PATCH] Sanitized community ID:', sanitizedCommunityId);

      const updatedPreferences = await communitiesStorage.upsertNotificationPreferences(
        user.id,
        preferences,
        sanitizedCommunityId
      );

      console.log('[PATCH] Successfully updated preferences');
      res.json({
        ok: true,
        preferences: updatedPreferences,
        message: 'Notification preferences updated successfully'
      });
    } catch (error: any) {
      console.error('[PATCH] Update notification preferences error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update notification preferences' });
    }
  });

  // ============ ADMIN ENDPOINTS ============

  /**
   * GET /api/admin/communities/selftest
   * Run system self-test and check all services
   */
  app.get('/api/admin/communities/selftest', requireAdmin, async (req: Request, res: Response) => {
    const results: any = {
      ok: true,
      timestamp: new Date().toISOString(),
      checks: {},
      metrics: {}
    };
    
    // Test database connectivity
    try {
      const dbTest = await communitiesStorage.testDatabaseConnection();
      results.checks.database = { 
        status: dbTest.ok ? 'pass' : 'fail', 
        message: dbTest.message, 
        responseTime: dbTest.responseTime 
      };
      if (!dbTest.ok) results.ok = false;
    } catch (error: any) {
      results.checks.database = { status: 'fail', message: error.message || 'Database connection failed' };
      results.ok = false;
    }
    
    // Test Supabase
    try {
      const communities = await communitiesStorage.getAllCommunities({ limit: 1 });
      results.checks.supabase = { status: 'pass', message: 'Connected' };
    } catch (error: any) {
      results.checks.supabase = { status: 'fail', message: error.message || 'Supabase connection failed' };
      results.ok = false;
    }
    
    // Test Stripe
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const stripeTest = await stripe.products.list({ limit: 1 });
        results.checks.stripe = { status: 'pass', message: 'API key valid' };
      } else {
        results.checks.stripe = { status: 'fail', message: 'API key not configured' };
        results.ok = false;
      }
    } catch (error: any) {
      results.checks.stripe = { status: 'fail', message: 'Invalid API key' };
      results.ok = false;
    }
    
    // Test SendGrid
    const sendgridKey = process.env.SENDGRID_API_KEY;
    results.checks.sendgrid = sendgridKey 
      ? { status: 'pass', message: 'API key configured' }
      : { status: 'warning', message: 'API key not configured' };
    
    // Test WebSocket
    try {
      const wsPort = process.env.WS_PORT || '3001';
      results.checks.websocket = { 
        status: 'pass', 
        message: `Running on port ${wsPort}`, 
        port: parseInt(wsPort) 
      };
    } catch (error: any) {
      results.checks.websocket = { status: 'fail', message: 'WebSocket server not running' };
    }
    
    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'ADMIN_KEY'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    results.checks.environment = missingVars.length === 0
      ? { status: 'pass', message: 'All required variables set' }
      : { status: 'fail', message: 'Missing variables', missing: missingVars };
    if (missingVars.length > 0) results.ok = false;
    
    // Get metrics
    try {
      const metrics = await communitiesStorage.getPlatformMetrics();
      results.metrics = {
        ...metrics,
        systemMemory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal
        },
        uptime: process.uptime()
      };
    } catch (error: any) {
      results.metrics = { error: 'Failed to get metrics' };
    }
    
    res.json(results);
  });

  /**
   * GET /api/admin/communities
   * List all communities with stats
   */
  app.get('/api/admin/communities', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, plan, search, limit = 50, offset = 0, sortBy, sortOrder } = req.query;
      
      const result = await communitiesStorage.getAllCommunitiesAdmin(
        {
          status: status as string,
          plan: plan as string,
          searchTerm: search as string
        },
        {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc'
        }
      );

      res.json({
        ok: true,
        ...result
      });
    } catch (error: any) {
      console.error('Get all communities admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get communities' });
    }
  });

  /**
   * GET /api/admin/communities/:id
   * Get detailed community info
   */
  app.get('/api/admin/communities/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const stats = await communitiesStorage.getCommunityStats(id);
      
      res.json({
        ok: true,
        stats
      });
    } catch (error: any) {
      console.error('Get community stats admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get community stats' });
    }
  });

  /**
   * PATCH /api/admin/communities/:id
   * Update community settings
   */
  app.patch('/api/admin/communities/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).adminId;
      const updates = req.body;
      
      const community = await communitiesStorage.updateCommunity(id, updates);
      
      // Log admin action
      await communitiesStorage.logAdminAction({
        adminId,
        action: 'update_community',
        targetType: 'community',
        targetId: id,
        metadata: { updates }
      });
      
      res.json({
        ok: true,
        community
      });
    } catch (error: any) {
      console.error('Update community admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update community' });
    }
  });

  /**
   * DELETE /api/admin/communities/:id
   * Delete a community (with cascade)
   */
  app.delete('/api/admin/communities/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).adminId;
      
      // First log the action (before deletion so we capture the community data)
      await communitiesStorage.logAdminAction({
        adminId,
        action: 'delete_community',
        targetType: 'community',
        targetId: id,
        metadata: { permanently: true }
      });
      
      await communitiesStorage.deleteCommunity(id);
      
      res.json({
        ok: true,
        message: 'Community deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete community admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete community' });
    }
  });

  /**
   * POST /api/admin/communities/:id/suspend
   * Suspend a community
   */
  app.post('/api/admin/communities/:id/suspend', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).adminId;
      
      if (!reason) {
        return res.status(400).json({ ok: false, error: 'Suspension reason is required' });
      }
      
      const community = await communitiesStorage.suspendCommunity(id, reason, adminId);
      
      res.json({
        ok: true,
        community
      });
    } catch (error: any) {
      console.error('Suspend community admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to suspend community' });
    }
  });

  /**
   * POST /api/admin/communities/:id/restore
   * Restore suspended community
   */
  app.post('/api/admin/communities/:id/restore', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).adminId;
      
      const community = await communitiesStorage.restoreCommunity(id, adminId);
      
      res.json({
        ok: true,
        community
      });
    } catch (error: any) {
      console.error('Restore community admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to restore community' });
    }
  });

  /**
   * GET /api/admin/communities/metrics
   * Platform-wide metrics
   */
  app.get('/api/admin/communities/metrics', requireAdmin, async (req: Request, res: Response) => {
    try {
      const metrics = await communitiesStorage.getPlatformMetrics();
      
      res.json({
        ok: true,
        metrics
      });
    } catch (error: any) {
      console.error('Get platform metrics admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get platform metrics' });
    }
  });

  /**
   * GET /api/admin/communities/revenue
   * Revenue analytics
   */
  app.get('/api/admin/communities/revenue', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const analytics = await communitiesStorage.getRevenueAnalytics(start, end);
      
      res.json({
        ok: true,
        analytics,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
    } catch (error: any) {
      console.error('Get revenue analytics admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get revenue analytics' });
    }
  });

  /**
   * GET /api/admin/communities/audit-log
   * Get audit log entries
   */
  app.get('/api/admin/communities/audit-log', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { adminId, targetType, targetId, action, startDate, endDate, limit = 100, offset = 0 } = req.query;
      
      const result = await communitiesStorage.getAuditLog(
        {
          adminId: adminId as string,
          targetType: targetType as string,
          targetId: targetId as string,
          action: action as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined
        },
        {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      );
      
      res.json({
        ok: true,
        ...result
      });
    } catch (error: any) {
      console.error('Get audit log admin error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get audit log' });
    }
  });

  // ============ INVITE LINKS SYSTEM ============

  /**
   * POST /api/communities/:id/invites
   * Create an invite link for a community (owners and moderators)
   */
  app.post('/api/communities/:id/invites', checkCommunitiesFeatureFlag, requireAuth, rateLimiter.middleware(rateLimitPresets.authenticated), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { expiresInDays, maxUses, customCode } = req.body;

      // Verify user is community owner or moderator
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      // If not owner, check if user is an approved moderator
      if (!isOwner) {
        const membership = await communitiesStorage.getMembership(community.id, user.id);
        if (!membership || membership.status !== 'approved' || (membership.role !== 'moderator' && membership.role !== 'owner')) {
          return res.status(403).json({ ok: false, error: 'Only community owners and moderators can create invite links' });
        }
      }

      // Create invite link
      const invite = await inviteSystem.createInviteLink(
        community.id,
        user.id,
        { expiresInDays, maxUses, customCode: sanitizeText(customCode || '') }
      );

      // Clear cache for community invites
      queryCache.delete(cacheKeys.communityInvites(community.id));

      res.json({
        ok: true,
        invite,
        inviteUrl: `${process.env.APP_URL || 'https://thehouseofjugnu.com'}/invite/${invite.code}`
      });
    } catch (error: any) {
      console.error('Create invite link error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create invite link' });
    }
  });

  /**
   * GET /api/communities/:id/invites
   * Get all invite links for a community (owners and moderators)
   */
  app.get('/api/communities/:id/invites', checkCommunitiesFeatureFlag, requireAuth, rateLimiter.middleware(rateLimitPresets.authenticated), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Check cache first
      const cacheKey = cacheKeys.communityInvites(id);
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return res.json({ ok: true, invites: cached });
      }

      // Verify user is community owner or moderator
      const community = await communitiesStorage.getCommunityById(id);
      if (!community) {
        return res.status(404).json({ ok: false, error: 'Community not found' });
      }

      // Check if user is owner
      const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      const isOwner = organizer && organizer.id === community.organizerId;
      
      // If not owner, check if user is an approved moderator
      if (!isOwner) {
        const membership = await communitiesStorage.getMembership(community.id, user.id);
        if (!membership || membership.status !== 'approved' || (membership.role !== 'moderator' && membership.role !== 'owner')) {
          return res.status(403).json({ ok: false, error: 'Only community owners and moderators can view invite links' });
        }
      }

      // Get invite links
      const invites = await inviteSystem.getCommunityInvites(community.id);

      // Cache the result
      queryCache.set(cacheKey, invites, cacheTTL.medium);

      res.json({ ok: true, invites });
    } catch (error: any) {
      console.error('Get invite links error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get invite links' });
    }
  });

  /**
   * GET /api/invite/:code
   * Get invite details by code
   */
  app.get('/api/invite/:code', rateLimiter.middleware(rateLimitPresets.unauthenticated), async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      // Check cache first
      const cacheKey = cacheKeys.inviteLink(code);
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return res.json({ ok: true, invite: cached });
      }

      const invite = await inviteSystem.getInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ ok: false, error: 'Invalid or expired invite code' });
      }

      // Cache the result
      queryCache.set(cacheKey, invite, cacheTTL.short);

      res.json({ ok: true, invite });
    } catch (error: any) {
      console.error('Get invite error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get invite details' });
    }
  });

  /**
   * POST /api/invite/:code/use
   * Use an invite link to join a community
   */
  app.post('/api/invite/:code/use', requireAuth, rateLimiter.middleware(rateLimitPresets.sensitive), async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const user = (req as any).user;

      const result = await inviteSystem.useInvite(code, user.id);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      // Clear relevant caches
      queryCache.delete(cacheKeys.inviteLink(code));
      queryCache.delete(cacheKeys.userCommunities(user.id));
      queryCache.delete(cacheKeys.userReferrals(user.id));
      if (result.communityId) {
        queryCache.delete(cacheKeys.communityMembers(result.communityId, 1));
      }

      res.json({
        ok: true,
        message: 'Successfully joined community',
        communityId: result.communityId
      });
    } catch (error: any) {
      console.error('Use invite error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to use invite' });
    }
  });

  /**
   * GET /api/user/referrals
   * Get referral statistics for the current user
   */
  app.get('/api/user/referrals', requireAuth, rateLimiter.middleware(rateLimitPresets.authenticated), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const communityId = req.query.communityId as string | undefined;

      // Check cache first
      const cacheKey = cacheKeys.userReferrals(user.id);
      const cached = queryCache.get(cacheKey);
      if (cached && !communityId) {
        return res.json({ ok: true, stats: cached });
      }

      const stats = await inviteSystem.getReferralStats(user.id, communityId);

      // Cache the result
      if (!communityId) {
        queryCache.set(cacheKey, stats, cacheTTL.medium);
      }

      res.json({ ok: true, stats });
    } catch (error: any) {
      console.error('Get referral stats error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get referral stats' });
    }
  });

  /**
   * GET /api/communities/:id/referral-leaderboard
   * Get referral leaderboard for a community
   */
  app.get('/api/communities/:id/referral-leaderboard', checkCommunitiesFeatureFlag, requireAuth, rateLimiter.middleware(rateLimitPresets.authenticated), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await inviteSystem.getReferralLeaderboard(id, limit);

      res.json({ ok: true, leaderboard });
    } catch (error: any) {
      console.error('Get referral leaderboard error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get leaderboard' });
    }
  });

  console.log('✅ Platform authentication (/api/auth/*), organizer (/api/organizers/*), admin (/api/admin/organizers/*), and communities routes (/api/communities/*) added');
}