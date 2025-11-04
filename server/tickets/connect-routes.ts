import { Express, Request, Response } from 'express';
import { StripeConnectService } from './stripe-connect-service.js';
import { ticketsStorage } from './tickets-storage.js';
import { communitiesStorage } from '../communities/communities-supabase.js';
import { z } from 'zod';

/**
 * Stripe Connect onboarding routes for ticketing organizers
 * These routes handle the flow for businesses to set up their Stripe account
 */
export function addConnectRoutes(app: Express) {
  
  // Create or get Connect account and start onboarding
  app.post('/api/tickets/connect/onboarding', async (req: Request, res: Response) => {
    try {
      // Support both session-based and header-based auth (like requireOrganizer middleware)
      let userId = req.session?.userId;
      let organizerId = req.headers['x-organizer-id'] as string;
      
      // If we have an organizer ID from header, fetch that organizer directly
      if (organizerId) {
        const organizer = await ticketsStorage.getOrganizerById(organizerId);
        if (organizer) {
          userId = organizer.userId ?? undefined;
        }
      }
      
      if (!userId && !organizerId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      // Get or create organizer record (prefer fetching by userId if available)
      let organizer = userId ? await ticketsStorage.getOrganizerByUserId(userId) : null;
      if (!organizer && organizerId) {
        organizer = await ticketsStorage.getOrganizerById(organizerId);
      }
      
      if (!organizer && userId) {
        // Fetch user data to get their actual email
        const user = await communitiesStorage.getUserById(userId);
        
        if (!user) {
          return res.status(404).json({ ok: false, error: 'User not found' });
        }
        
        if (!user.email) {
          return res.status(400).json({ ok: false, error: 'User email is required to enable ticketing' });
        }
        
        // Check if organizer already exists by email (from previous incomplete onboarding)
        organizer = await ticketsStorage.getOrganizerByEmail(user.email);
        
        if (organizer) {
          // Link existing organizer to this userId if not already linked
          if (!organizer.userId) {
            console.log(`[Ticketing] Linking existing organizer ${organizer.id} to user ${userId}`);
            organizer = await ticketsStorage.updateOrganizer(organizer.id, { userId });
          }
        } else {
          // Create new organizer record
          console.log(`[Ticketing] Creating new organizer for user ${userId} with email ${user.email}`);
          organizer = await ticketsStorage.createOrganizer({
            userId,
            email: user.email,
            businessName: req.body.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'My Business',
            businessEmail: req.body.businessEmail || user.email,
            status: 'pending',
          });
        }
      }
      
      if (!organizer) {
        return res.status(404).json({ ok: false, error: 'Organizer not found' });
      }

      // Create or retrieve Stripe Connect account
      let accountId = organizer.stripeAccountId ?? undefined;
      
      if (!accountId) {
        // Create new Connect account
        // Default to 'individual' for simpler onboarding (SIN + bank info only, no business registration needed)
        // Can be overridden by passing businessType in request body
        accountId = await StripeConnectService.createConnectAccount({
          email: organizer.email,
          businessName: organizer.businessName ?? undefined,
          country: 'CA', // Canada
          businessType: req.body.businessType || 'individual',
        });

        // Save account ID to organizer record
        await ticketsStorage.updateOrganizerStripeAccount(organizer.id, accountId);
      }

      // Create onboarding link using frontend-provided URLs
      const accountLink = await StripeConnectService.createAccountLink({
        accountId,
        refreshUrl: req.body.refreshUrl || `${req.protocol}://${req.get('host')}/tickets/organizer/connect`,
        returnUrl: req.body.returnUrl || `${req.protocol}://${req.get('host')}/tickets/organizer/connect?success=true`,
      });

      res.json({
        ok: true,
        url: accountLink, // Frontend expects 'url' not 'onboardingUrl'
        accountId,
      });

    } catch (error: any) {
      console.error('Error creating Connect onboarding:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create onboarding' });
    }
  });

  // Get Stripe Connect login link (for organizers to access their Stripe Dashboard)
  // If no account exists yet, creates one and returns onboarding URL
  app.post('/api/tickets/connect/login', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      let organizer = await ticketsStorage.getOrganizerByUserId(userId);
      
      if (!organizer) {
        // Fetch user data to create organizer
        const user = await communitiesStorage.getUserById(userId);
        
        if (!user || !user.email) {
          return res.status(404).json({ ok: false, error: 'User not found or missing email' });
        }
        
        // Check if organizer exists by email
        organizer = await ticketsStorage.getOrganizerByEmail(user.email);
        
        if (organizer) {
          // Link to userId if not already
          if (!organizer.userId) {
            organizer = await ticketsStorage.updateOrganizer(organizer.id, { userId });
          }
        } else {
          // Create new organizer
          organizer = await ticketsStorage.createOrganizer({
            userId,
            email: user.email,
            businessName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'My Business',
            businessEmail: user.email,
            status: 'pending',
          });
        }
      }

      // If no Stripe account yet, create one and return onboarding link
      if (!organizer.stripeAccountId) {
        const accountId = await StripeConnectService.createConnectAccount({
          email: organizer.email,
          businessName: organizer.businessName ?? undefined,
          country: 'CA',
          businessType: req.body.businessType || 'individual',
        });

        await ticketsStorage.updateOrganizerStripeAccount(organizer.id, accountId);
        
        // Return onboarding link for new account
        const onboardingUrl = await StripeConnectService.createAccountLink({
          accountId,
          refreshUrl: req.body.refreshUrl || `${req.protocol}://${req.get('host')}/communities`,
          returnUrl: req.body.returnUrl || `${req.protocol}://${req.get('host')}/communities`,
        });

        return res.json({
          ok: true,
          url: onboardingUrl,
          isOnboarding: true,
        });
      }

      // Account exists, create login link to Stripe Dashboard
      const loginUrl = await StripeConnectService.createLoginLink(organizer.stripeAccountId);

      res.json({
        ok: true,
        url: loginUrl,
        isOnboarding: false,
      });

    } catch (error: any) {
      console.error('Error creating Stripe login/onboarding link:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create link' });
    }
  });

  // Get Connect account status (works with session OR account ID query param)
  app.get('/api/tickets/connect/status', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const accountId = req.query.accountId as string;

      let organizer;

      if (accountId) {
        // Public endpoint: fetch by Stripe account ID (for post-onboarding status check)
        organizer = await ticketsStorage.getOrganizerByStripeAccountId(accountId);
      } else if (userId) {
        // Session-based: fetch by user ID
        organizer = await ticketsStorage.getOrganizerByUserId(userId);
      } else {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }
      
      if (!organizer) {
        return res.json({
          ok: true,
          hasAccount: false,
          onboardingComplete: false,
        });
      }

      // Handle snake_case from Supabase
      const stripeAccountId = (organizer as any).stripe_account_id || organizer.stripeAccountId;
      
      if (!stripeAccountId) {
        return res.json({
          ok: true,
          hasAccount: false,
          onboardingComplete: false,
          organizerId: organizer.id,
        });
      }

      // Fetch latest status from Stripe
      const status = await StripeConnectService.getAccountStatus(stripeAccountId);

      console.log(`[Stripe Connect] Status for account ${stripeAccountId}:`, {
        onboardingComplete: status.onboardingComplete,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        currentlyDue: status.requirements.currentlyDue,
      });

      // Update local database with latest status
      await ticketsStorage.updateOrganizer(organizer.id, {
        stripeOnboardingComplete: status.onboardingComplete,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
        stripeDetailsSubmitted: status.detailsSubmitted,
        status: status.chargesEnabled ? 'active' : 'pending',
      });

      res.json({
        ok: true,
        hasAccount: true,
        accountId: status.accountId,
        onboardingComplete: status.onboardingComplete,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        requirements: status.requirements,
        organizerId: organizer.id,
      });

    } catch (error: any) {
      console.error('Error fetching Connect status:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to fetch status' });
    }
  });

  // Create Stripe Dashboard login link
  app.post('/api/tickets/connect/dashboard-link', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
      
      if (!organizer?.stripeAccountId) {
        return res.status(400).json({ ok: false, error: 'No Stripe account found' });
      }

      const loginLink = await StripeConnectService.createLoginLink(organizer.stripeAccountId);

      res.json({
        ok: true,
        dashboardUrl: loginLink,
      });

    } catch (error: any) {
      console.error('Error creating dashboard link:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create dashboard link' });
    }
  });

  // Webhook handler for account.updated events
  app.post('/api/tickets/webhooks/connect', async (req: Request, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      
      if (!sig) {
        return res.status(400).json({ ok: false, error: 'Missing signature' });
      }

      // Verify webhook signature
      const event = StripeConnectService.verifyWebhookSignature(
        req.body,
        sig
      );

      if (!event) {
        return res.status(400).json({ ok: false, error: 'Invalid signature' });
      }

      // Handle account.updated event
      if (event.type === 'account.updated') {
        const account = event.data.object as any;
        const accountId = account.id;

        // Find organizer by Stripe account ID
        const organizer = await ticketsStorage.getOrganizerByStripeAccountId(accountId);
        
        if (organizer) {
          // Update account status
          const status = await StripeConnectService.handleAccountUpdate(accountId);
          
          await ticketsStorage.updateOrganizer(organizer.id, {
            stripeOnboardingComplete: status.onboardingComplete,
            stripeChargesEnabled: status.chargesEnabled,
            stripePayoutsEnabled: status.payoutsEnabled,
            stripeDetailsSubmitted: status.detailsSubmitted,
            status: status.chargesEnabled ? 'active' : 'pending',
          });

          console.log(`Updated Connect account status for organizer ${organizer.id}`);
        }
      }

      res.json({ ok: true, received: true });

    } catch (error: any) {
      console.error('Error processing Connect webhook:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}
