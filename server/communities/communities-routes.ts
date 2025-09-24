import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { communitiesStorage } from './communities-supabase';
import { insertUserSchema } from '@shared/schema';


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

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  
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
import { sendVerificationEmail } from '../services/emailService.js';

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

export function addCommunitiesRoutes(app: Express) {
  console.log('✅ Adding Communities routes...');

  // ============ AUTHENTICATION ENDPOINTS ============

  /**
   * POST /api/account/signup
   * Create a new user account and send email verification code
   * curl -X POST http://localhost:5000/api/account/signup \
   *   -H "Content-Type: application/json" \
   *   -d '{"email":"user@example.com","firstName":"John","lastName":"Doe"}'
   */
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
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
   * POST /api/account/signin
   * Send login code to existing user's email
   * curl -X POST http://localhost:5000/api/account/signin \
   *   -H "Content-Type: application/json" \
   *   -d '{"email":"user@example.com"}'
   */
  app.post('/api/auth/signin', async (req: Request, res: Response) => {
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
  app.post('/api/auth/verify-code', async (req: Request, res: Response) => {
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
      if (authCode.purpose === 'signup' && user.status === 'pending_verification') {
        await communitiesStorage.updateUser(user.id, {
          status: 'active',
          emailVerified: true
        });
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
    try {
      const user = (req as any).user;
      
      // Check if user is an organizer
      let organizerApplication = null;
      let organizer = null;
      
      if (user.role === 'organizer' || user.role === 'admin') {
        organizer = await communitiesStorage.getOrganizerByUserId(user.id);
      }

      // Always check for pending applications
      const { data: applications } = await communitiesStorage.client
        .from('community_organizer_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (applications && applications.length > 0) {
        organizerApplication = applications[0];
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

      // Clear cookie
      res.clearCookie('community_auth_token');

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

      // Clear cookie
      res.clearCookie('community_auth_token');

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

      // Generate verification code for email change
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store verification code with email_change purpose
      await communitiesStorage.createAuthCode({
        userId: user.id,
        email: newEmail,
        code,
        purpose: 'email_change',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        usedAt: null,
        attempts: 0,
        maxAttempts: 5
      });

      // Send verification email to new email address
      const emailSent = await sendEmailCode(newEmail, code, 'email_change', user.firstName);

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
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await communitiesStorage.createAuthCode({
        userId: user.id,
        email: newEmail,
        code: newVerificationCode,
        purpose: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        usedAt: null,
        attempts: 0,
        maxAttempts: 5
      });

      // Send verification email for the new email
      await sendEmailCode(newEmail, newVerificationCode, 'email_verification', user.firstName);

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
        message: 'Organizer application submitted successfully. Our team will review it shortly.',
        application: {
          id: application.id,
          businessName: application.businessName,
          businessType: application.businessType,
          status: application.status,
          createdAt: application.createdAt
        }
      });
    } catch (error: any) {
      console.error('Organizer application error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to submit application' });
    }
  });

  // ============ ADMIN ORGANIZER APPROVAL ENDPOINTS ============
  
  // Admin key middleware for API endpoints (using ADMIN_PASSWORD)
  const requireAdminKey = (req: Request, res: Response, next: any) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD;
    
    if (!expectedKey) {
      return res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD not configured' });
    }
    
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Admin password required' });
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
      console.error('Get pending applications error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to get applications' });
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
        reviewedBy: 'admin', // Using admin key system
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
        approvedBy: 'admin' // Using admin key system
      });

      res.json({
        ok: true,
        message: 'Organizer application approved successfully',
        organizer: {
          id: organizer.id,
          businessName: organizer.businessName,
          businessType: organizer.businessType,
          status: organizer.status,
          approvedAt: organizer.approvedAt
        }
      });
    } catch (error: any) {
      console.error('Approve organizer error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to approve application' });
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

      if (!rejectionReason) {
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
        reviewedBy: 'admin', // Using admin key system
        rejectionReason,
        adminNotes
      });

      res.json({
        ok: true,
        message: 'Organizer application rejected',
        rejectionReason
      });
    } catch (error: any) {
      console.error('Reject organizer error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to reject application' });
    }
  });

  console.log('✅ Platform authentication (/api/auth/*), organizer (/api/organizers/*), and admin (/api/admin/organizers/*) routes added');
}