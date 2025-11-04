import { Express, Request, Response } from 'express';
import { StripeConnectService } from './stripe-connect-service.js';
import { ticketsStorage } from './tickets-storage.js';
import { z } from 'zod';

/**
 * Stripe Connect onboarding routes for ticketing organizers
 * These routes handle the flow for businesses to set up their Stripe account
 */
export function addConnectRoutes(app: Express) {
  
  // Create or get Connect account and start onboarding
  app.post('/api/tickets/connect/onboarding', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      // Get or create organizer record
      let organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
      
      if (!organizer) {
        // Create new organizer record
        organizer = await ticketsStorage.createOrganizer({
          userId: req.session.userId,
          email: req.body.email || `user-${req.session.userId}@jugnu.ca`,
          businessName: req.body.businessName || 'My Business',
          businessEmail: req.body.businessEmail || req.body.email,
          status: 'pending',
        });
      }

      // Create or retrieve Stripe Connect account
      let accountId = organizer.stripeAccountId || undefined;
      
      if (!accountId) {
        // Create new Connect account
        accountId = await StripeConnectService.createConnectAccount({
          email: organizer.email,
          businessName: organizer.businessName,
          country: 'CA', // Canada
        });

        // Save account ID to organizer record
        await ticketsStorage.updateOrganizerStripeAccount(organizer.id, accountId);
      }

      // Create onboarding link
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const accountLink = await StripeConnectService.createAccountLink({
        accountId,
        refreshUrl: `${appUrl}/business/ticketing/onboarding`,
        returnUrl: `${appUrl}/business/ticketing/dashboard?onboarding=complete`,
      });

      res.json({
        ok: true,
        onboardingUrl: accountLink,
        accountId,
      });

    } catch (error: any) {
      console.error('Error creating Connect onboarding:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create onboarding' });
    }
  });

  // Get Connect account status
  app.get('/api/tickets/connect/status', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
      
      if (!organizer) {
        return res.json({
          ok: true,
          hasAccount: false,
          onboardingComplete: false,
        });
      }

      if (!organizer.stripeAccountId) {
        return res.json({
          ok: true,
          hasAccount: false,
          onboardingComplete: false,
          organizerId: organizer.id,
        });
      }

      // Fetch latest status from Stripe
      const status = await StripeConnectService.getAccountStatus(organizer.stripeAccountId);

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
