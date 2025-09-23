import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { communitiesStorage } from './communities-supabase';
import { insertCommunityUserSchema } from '@shared/schema';

// Check if Communities is enabled
const isCommunitiesEnabled = () => process.env.ENABLE_COMMUNITIES === 'true';

// Middleware to check if Communities is enabled
const requireCommunities = (req: Request, res: Response, next: any) => {
  if (!isCommunitiesEnabled()) {
    console.log(`[Communities] Disabled - API route ${req.path} blocked by ENABLE_COMMUNITIES flag`);
    return res.status(404).json({ ok: false, disabled: true });
  }
  next();
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
    (req as any).session = session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
};

// Validation schemas
const signupSchema = insertCommunityUserSchema.extend({
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
});

// Helper to send email codes (mock implementation for now)
const sendEmailCode = async (email: string, code: string, purpose: string = 'login') => {
  // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
  console.log(`[Communities] Email code for ${email}: ${code} (${purpose})`);
  console.log(`📧 [DEV] Would send email to ${email} with code: ${code}`);
  
  // In development, just log the code
  return true;
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
  app.post('/api/account/signup', requireCommunities, async (req: Request, res: Response) => {
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
  app.post('/api/account/signin', requireCommunities, async (req: Request, res: Response) => {
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
  app.post('/api/account/verify-code', requireCommunities, async (req: Request, res: Response) => {
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
  app.get('/api/account/me', requireCommunities, requireAuth, async (req: Request, res: Response) => {
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
          createdAt: user.createdAt
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
  app.patch('/api/account/me', requireCommunities, requireAuth, async (req: Request, res: Response) => {
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
          marketingEmails: updatedUser.marketingEmails
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
  app.post('/api/account/signout', requireCommunities, requireAuth, async (req: Request, res: Response) => {
    try {
      const session = (req as any).session;

      // Deactivate current session
      await communitiesStorage.deactivateSession(session.token);

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
  app.post('/api/account/signout-all', requireCommunities, requireAuth, async (req: Request, res: Response) => {
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

  app.post('/api/account/apply-organizer', requireCommunities, requireAuth, async (req: Request, res: Response) => {
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
          error: `You already have a ${existing.status} organizer application`
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
  
  // Middleware to check admin permissions
  const requireAdmin = async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }
    next();
  };

  /**
   * GET /api/account/admin/organizers/pending
   * Get all pending organizer applications (admin only)
   * curl -X GET http://localhost:5000/api/account/admin/organizers/pending \
   *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   */
  app.get('/api/account/admin/organizers/pending', requireCommunities, requireAuth, requireAdmin, async (req: Request, res: Response) => {
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
   * POST /api/account/admin/organizers/:id/approve
   * Approve an organizer application (admin only)
   * curl -X POST http://localhost:5000/api/account/admin/organizers/APPLICATION_ID/approve \
   *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"adminNotes":"Great application, approved!"}'
   */
  app.post('/api/account/admin/organizers/:id/approve', requireCommunities, requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;
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
        reviewedBy: adminUser.id,
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
        approvedBy: adminUser.id
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
   * POST /api/account/admin/organizers/:id/reject
   * Reject an organizer application (admin only)
   * curl -X POST http://localhost:5000/api/account/admin/organizers/APPLICATION_ID/reject \
   *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"rejectionReason":"Insufficient experience","adminNotes":"Please reapply after gaining more experience"}'
   */
  app.post('/api/account/admin/organizers/:id/reject', requireCommunities, requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;
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
        reviewedBy: adminUser.id,
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

  console.log('✅ Communities authentication, organizer, and admin routes added');
}