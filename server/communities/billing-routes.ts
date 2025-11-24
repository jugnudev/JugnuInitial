import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { CommunitiesSupabaseDB } from './communities-supabase';
import { CreditsService } from './credits-service';
import { TicketsSupabaseDB } from '../tickets/tickets-supabase';

const router = Router();
const communitiesStorage = new CommunitiesSupabaseDB();
const ticketsStorage = new TicketsSupabaseDB();
const creditsService = new CreditsService(communitiesStorage);

// Auth middleware
const requireAuth = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ ok: false, error: 'No authorization token provided' });
  }
  
  try {
    const session = await communitiesStorage.getSessionByToken(sessionToken);
    
    if (!session || !session.userId) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    }
    
    const user = await communitiesStorage.getUserById(session.userId);
    
    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }
    
    (req as any).user = user;
    (req as any).sessionToken = sessionToken;
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ ok: false, error: 'Authentication failed' });
  }
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

// Pricing configuration
const PRICING = {
  individual: {
    monthly: {
      priceId: process.env.STRIPE_PRICE_COMMUNITY_MONTHLY || 'price_community_monthly',
      amount: 5000, // $50 CAD in cents
      currency: 'cad',
      placementCredits: 2 // Number of ad placement credits per billing cycle
    }
  }
};

/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for individual community subscription
 */
router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId } = req.body;
    const user = (req as any).user;

    // Validate input
    if (!communityId) {
      return res.status(400).json({ ok: false, error: 'Community ID required' });
    }

    // Verify community ownership
    const community = await communitiesStorage.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, error: 'Community not found' });
    }

    // Check ownership through organizer
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    if (!organizer || community.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'Only community owners can manage billing' });
    }

    // Check if already has active subscription
    const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (existingSubscription && ['active', 'trialing'].includes(existingSubscription.status)) {
      return res.status(400).json({ ok: false, error: 'Community already has an active subscription' });
    }

    // Get or create Stripe customer
    let customerId: string;
    const existingCustomer = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomer.data.length > 0) {
      customerId = existingCustomer.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: {
          userId: user.id,
          communityId
        }
      });
      customerId = customer.id;
    }

    // Get price and metadata
    const priceConfig = PRICING.individual.monthly;
    const metadata = {
      type: 'individual',
      communityId,
      userId: user.id
    };

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceConfig.priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/billing/cancelled`,
      metadata,
      subscription_data: {
        trial_period_days: 14,
        metadata
      },
      customer_update: {
        address: 'auto'
      }
    });

    res.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * GET /api/billing/subscription/:communityId
 * Get subscription details for a community
 */
router.get('/subscription/:communityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId } = req.params;
    const user = (req as any).user;

    // Get community to verify ownership
    const community = await communitiesStorage.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, error: 'Community not found' });
    }

    // Get subscription
    let subscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (!subscription) {
      return res.json({
        ok: true,
        subscription: null,
        canManage: false
      });
    }

    // DETECT and LOG inconsistent status (active without stripe_customer_id should be trialing)
    // Don't auto-fix as it could affect valid paid subscriptions with sync issues
    if (subscription.status === 'active' && !subscription.stripeCustomerId) {
      console.warn(`[Billing] WARNING: Subscription ${subscription.id} has status='active' but no stripe_customer_id. This may indicate a data inconsistency.`);
      // For now, return the subscription as-is and let the UI handle the edge case
      // Manual database fix: UPDATE community_subscriptions SET status = 'trialing' WHERE id = '${subscription.id}';
    }

    // Check if user can manage billing
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    const canManage = organizer && community.organizerId === organizer.id;

    // Get payment history if owner
    let payments: any[] = [];
    if (canManage && subscription.id) {
      payments = await communitiesStorage.getPaymentsBySubscriptionId(subscription.id);
    }

    // Get credits balance for active subscriptions
    let creditsAvailable = 0;
    if (subscription.status === 'active' && subscription.organizerId) {
      const creditCheck = await creditsService.checkCredits(subscription.organizerId, 0);
      creditsAvailable = creditCheck.availableCredits;
    }

    // Normalize trial end date (Supabase returns strings, not Date objects)
    const trialEndDate = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
    const trialEndsAt = trialEndDate?.toISOString() || null;
    const trialDaysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      ok: true,
      subscription: {
        ...subscription,
        payments: canManage ? payments : [],
        canManage,
        hasStripeCustomer: !!subscription.stripeCustomerId,
        trialEndsAt,
        trialDaysRemaining
      },
      credits: {
        available: creditsAvailable
      }
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to get subscription' });
  }
});

/**
 * POST /api/billing/create-portal-session
 * Create a Stripe billing portal session for subscription management
 */
router.post('/create-portal-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId } = req.body;
    const user = (req as any).user;

    if (!communityId) {
      return res.status(400).json({ ok: false, error: 'Community ID required' });
    }

    // Get subscription and verify ownership
    const subscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found for this community' });
    }

    // Verify ownership
    const community = await communitiesStorage.getCommunityById(communityId);
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    
    if (!community || !organizer || community.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    // Ensure customer has a Stripe customer ID
    if (!subscription.stripeCustomerId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No Stripe customer found for this subscription. Please complete the checkout process first to set up your payment method.'
      });
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/pricing`,
    });

    res.json({
      ok: true,
      url: portalSession.url
    });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create portal session' });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * Cancel an individual community subscription
 */
router.post('/cancel-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId } = req.body;
    const user = (req as any).user;

    if (!communityId) {
      return res.status(400).json({ ok: false, error: 'Community ID required' });
    }

    // Get subscription and verify ownership
    const subscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'Subscription not found' });
    }

    const community = await communitiesStorage.getCommunityById(subscription.communityId);
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    
    if (!community || !organizer || community.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    // Cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }

    // Update in database
    await communitiesStorage.updateSubscriptionStatus(subscription.id, 'canceled', {
      canceledAt: new Date()
    });

    res.json({ ok: true, message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * GET /api/billing/credits/balance
 * Get placement credit balance for the current organizer
 */
router.get('/credits/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get organizer
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ ok: false, error: 'Organizer account not found' });
    }

    // Get subscription for the organizer's community
    const communities = await communitiesStorage.getCommunitiesByOrganizerId(organizer.id);
    if (communities.length === 0) {
      return res.json({
        ok: true,
        credits: { available: 0, used: 0, resetDate: null }
      });
    }

    // Get subscription for first community (organizers typically have one main community)
    const subscription = await communitiesStorage.getSubscriptionByCommunityId(communities[0].id);
    if (!subscription) {
      return res.json({
        ok: true,
        credits: { available: 0, used: 0, resetDate: null },
        subscriptionStatus: 'none'
      });
    }

    // Only show credits for active subscriptions
    // Trial and inactive subscriptions get 0 credits
    if (subscription.status !== 'active') {
      return res.json({
        ok: true,
        credits: { available: 0, used: 0, resetDate: null },
        subscriptionStatus: subscription.status,
        message: subscription.status === 'trialing' 
          ? 'Credits are only available with an active paid subscription'
          : 'Active subscription required for placement credits'
      });
    }

    // Note: Credit reset is handled by Stripe webhooks on billing cycle
    // For manual reset, admins can call creditsService.resetCredits(subscription.id)
    
    res.json({
      ok: true,
      credits: {
        available: subscription.placementCreditsAvailable || 0,
        used: subscription.placementCreditsUsed || 0,
        resetDate: subscription.creditsResetDate || null
      },
      subscriptionStatus: subscription.status
    });
  } catch (error: any) {
    console.error('Get credit balance error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to get credit balance' });
  }
});

/**
 * POST /api/billing/credits/check
 * Check if organizer has enough credits for a placement
 */
router.post('/credits/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const { creditsNeeded } = req.body;
    const user = (req as any).user;

    if (!creditsNeeded || creditsNeeded < 1) {
      return res.status(400).json({ ok: false, error: 'Invalid credits amount' });
    }

    // Get organizer
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ ok: false, error: 'Organizer account not found' });
    }

    // Get subscription
    const communities = await communitiesStorage.getCommunitiesByOrganizerId(organizer.id);
    if (communities.length === 0) {
      return res.json({
        ok: true,
        hasEnoughCredits: false,
        available: 0,
        needed: creditsNeeded
      });
    }

    const subscription = await communitiesStorage.getSubscriptionByCommunityId(communities[0].id);
    if (!subscription) {
      return res.json({
        ok: true,
        hasEnoughCredits: false,
        available: 0,
        needed: creditsNeeded,
        subscriptionStatus: 'none'
      });
    }

    // Only active subscriptions have credits
    if (subscription.status !== 'active') {
      return res.json({
        ok: true,
        hasEnoughCredits: false,
        available: 0,
        needed: creditsNeeded,
        subscriptionStatus: subscription.status,
        message: subscription.status === 'trialing'
          ? 'Credits are only available with an active paid subscription'
          : 'Active subscription required for placement credits'
      });
    }

    // Check credits using checkCredits method
    const creditCheck = await creditsService.checkCredits(organizer.id, creditsNeeded);

    res.json({
      ok: true,
      hasEnoughCredits: creditCheck.hasCredits,
      available: creditCheck.availableCredits,
      needed: creditsNeeded,
      subscriptionStatus: subscription.status
    });
  } catch (error: any) {
    console.error('Check credits error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to check credits' });
  }
});

/**
 * GET /api/billing/credits/usage
 * Get placement credit usage history for the current organizer
 */
router.get('/credits/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get organizer
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ ok: false, error: 'Organizer account not found' });
    }

    // Get usage history
    const usage = await communitiesStorage.getCreditUsageByOrganizer(organizer.id);

    res.json({
      ok: true,
      usage: usage || []
    });
  } catch (error: any) {
    console.error('Get credit usage error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to get credit usage' });
  }
});

/**
 * POST /api/billing/credits/spend
 * Spend placement credits to feature an event
 */
router.post('/credits/spend', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { eventId, placement, startDate, endDate, creditsToDeduct } = req.body;

    // Validate input
    if (!eventId || !placement || !startDate || !endDate || !creditsToDeduct) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: eventId, placement, startDate, endDate, creditsToDeduct' 
      });
    }

    // Get organizer
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ ok: false, error: 'Organizer account not found' });
    }

    // Get event and verify ownership
    const event = await ticketsStorage.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    
    // CRITICAL: Verify the authenticated organizer owns this event
    if (event.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'You can only feature events that you own' });
    }

    // Check credit balance
    const creditCheck = await creditsService.checkCredits(organizer.id, creditsToDeduct);
    if (!creditCheck.hasCredits) {
      return res.status(402).json({ 
        ok: false, 
        error: 'Insufficient credits',
        available: creditCheck.availableCredits,
        needed: creditsToDeduct
      });
    }

    // Check for booking conflicts
    const conflicts = await communitiesStorage.checkPlacementConflicts(placement, startDate, endDate);
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ 
        ok: false, 
        error: 'Placement slot already booked for selected dates',
        conflicts: conflicts.map((c: any) => ({
          campaignName: c.name,
          startDate: c.startAt,
          endDate: c.endAt
        }))
      });
    }

    // Create sponsor campaign for featured event
    const campaign = await communitiesStorage.createSponsorCampaign({
      name: `Featured: ${event.title}`,
      sponsorName: organizer.businessName || user.firstName + ' ' + user.lastName,
      headline: event.title,
      subline: event.summary || `${event.venue} - ${new Date(event.startAt).toLocaleDateString()}`,
      ctaText: 'Get Tickets',
      clickUrl: `${process.env.VITE_APP_URL || 'https://thehouseofjugnu.com'}/events?e=${eventId}`,
      placements: [placement],
      startAt: new Date(startDate).toISOString(),
      endAt: new Date(endDate + 'T23:59:59').toISOString(), // End of day
      priority: 5, // Medium priority for community-featured events
      isActive: true,
      isSponsored: false // Community-featured events are not marked as sponsored
    });

    if (!campaign) {
      return res.status(500).json({ ok: false, error: 'Failed to create campaign' });
    }

    // Deduct credits and log usage
    await creditsService.deductCredits(
      organizer.id,
      creditsToDeduct,
      campaign.id,
      [placement],
      startDate,
      endDate
    );

    res.json({
      ok: true,
      campaignId: campaign.id,
      message: 'Event featured successfully',
      creditsDeducted: creditsToDeduct
    });
  } catch (error: any) {
    console.error('Spend credits error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to spend credits' });
  }
});

export default router;