import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { CommunitiesSupabaseDB } from './communities-supabase';

const router = Router();
const communitiesStorage = new CommunitiesSupabaseDB();

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
  apiVersion: '2024-11-20.acacia'
});

// Pricing configuration
const PRICING = {
  individual: {
    monthly: {
      priceId: process.env.STRIPE_PRICE_COMMUNITY_MONTHLY || 'price_community_monthly',
      amount: 2000, // $20 CAD in cents
      currency: 'cad'
    }
  },
  bundle: {
    starter_5: {
      priceId: process.env.STRIPE_PRICE_BUNDLE_5 || 'price_bundle_5',
      amount: 7500, // $75 CAD in cents for 5 communities (25% discount)
      currency: 'cad',
      communities: 5
    }
  }
};

/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for either individual subscription or bundle
 */
router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, communityId, organizerId } = req.body;
    const user = (req as any).user;

    // Validate input
    if (!type || !['individual', 'bundle'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'Invalid subscription type' });
    }

    if (type === 'individual' && !communityId) {
      return res.status(400).json({ ok: false, error: 'Community ID required for individual subscription' });
    }

    if (type === 'bundle' && !organizerId) {
      return res.status(400).json({ ok: false, error: 'Organizer ID required for bundle subscription' });
    }

    // For individual subscriptions, verify community ownership
    if (type === 'individual') {
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
    }

    // For bundle subscriptions, verify organizer
    if (type === 'bundle') {
      const organizer = await communitiesStorage.getOrganizerById(organizerId);
      if (!organizer || organizer.userId !== user.id) {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      // Check if already has active bundle
      const existingBundle = await communitiesStorage.getBundleByOrganizer(organizerId);
      if (existingBundle && ['active', 'trialing'].includes(existingBundle.status)) {
        return res.status(400).json({ ok: false, error: 'You already have an active bundle subscription' });
      }
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
          ...(type === 'individual' ? { communityId } : { organizerId })
        }
      });
      customerId = customer.id;
    }

    // Determine price and metadata
    const priceConfig = type === 'individual' 
      ? PRICING.individual.monthly 
      : PRICING.bundle.starter_5;

    const metadata = type === 'individual'
      ? {
          type: 'individual',
          communityId,
          userId: user.id
        }
      : {
          type: 'bundle',
          organizerId,
          userId: user.id,
          bundleType: 'starter_5'
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
    const subscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (!subscription) {
      return res.json({
        ok: true,
        subscription: null,
        canManage: false
      });
    }

    // Check if user can manage billing
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    const canManage = organizer && community.organizerId === organizer.id;

    // Get payment history if owner
    let payments = [];
    if (canManage && subscription.id) {
      payments = await communitiesStorage.getPaymentsBySubscriptionId(subscription.id);
    }

    // Check if part of a bundle
    let bundleInfo = null;
    if (subscription.bundleId) {
      const bundle = await communitiesStorage.getBundleByOrganizer(subscription.organizerId);
      if (bundle) {
        bundleInfo = {
          id: bundle.id,
          type: bundle.bundleType,
          communitiesIncluded: bundle.communitiesIncluded,
          communitiesUsed: bundle.communitiesUsed,
          status: bundle.status
        };
      }
    }

    res.json({
      ok: true,
      subscription: {
        ...subscription,
        payments: canManage ? payments : [],
        bundle: bundleInfo,
        canManage,
        // Calculate trial days remaining
        trialDaysRemaining: subscription.trialEnd 
          ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null
      }
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to get subscription' });
  }
});

/**
 * GET /api/billing/bundle/:organizerId
 * Get bundle subscription details for an organizer
 */
router.get('/bundle/:organizerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { organizerId } = req.params;
    const user = (req as any).user;

    // Verify organizer ownership
    const organizer = await communitiesStorage.getOrganizerById(organizerId);
    if (!organizer || organizer.userId !== user.id) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    // Get bundle subscription
    const bundle = await communitiesStorage.getBundleByOrganizer(organizerId);
    if (!bundle) {
      return res.json({
        ok: true,
        bundle: null
      });
    }

    // Get communities using this bundle
    const subscriptions = await communitiesStorage.getSubscriptionByOrganizer(organizerId);
    const bundledCommunities = subscriptions.filter(sub => sub.bundleId === bundle.id);

    res.json({
      ok: true,
      bundle: {
        ...bundle,
        communities: bundledCommunities.map(sub => ({
          id: sub.communityId,
          status: sub.status
        })),
        availableSlots: bundle.communitiesIncluded - bundle.communitiesUsed
      }
    });
  } catch (error: any) {
    console.error('Get bundle error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to get bundle' });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * Cancel a subscription (individual or bundle)
 */
router.post('/cancel-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const { subscriptionId, type } = req.body;
    const user = (req as any).user;

    if (!subscriptionId || !type || !['individual', 'bundle'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    if (type === 'individual') {
      // Get subscription and verify ownership
      const subscription = await communitiesStorage.getSubscriptionByCommunityId(subscriptionId);
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
        canceledAt: new Date().toISOString()
      });
    } else {
      // Handle bundle cancellation
      const bundle = await communitiesStorage.getBundleByOrganizer(subscriptionId);
      if (!bundle) {
        return res.status(404).json({ ok: false, error: 'Bundle not found' });
      }

      const organizer = await communitiesStorage.getOrganizerById(bundle.organizerId);
      if (!organizer || organizer.userId !== user.id) {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      // Cancel in Stripe
      if (bundle.stripeSubscriptionId) {
        await stripe.subscriptions.update(bundle.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update bundle status
      // Note: We'll need to add updateBundleStatus method to CommunitiesSupabaseDB
    }

    res.json({ ok: true, message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/billing/assign-to-bundle
 * Assign a community to an existing bundle
 */
router.post('/assign-to-bundle', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId, bundleId } = req.body;
    const user = (req as any).user;

    if (!communityId || !bundleId) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // Verify ownership and bundle capacity
    const community = await communitiesStorage.getCommunityById(communityId);
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    
    if (!community || !organizer || community.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    const bundle = await communitiesStorage.getBundleByOrganizer(organizer.id);
    if (!bundle || bundle.id !== bundleId) {
      return res.status(404).json({ ok: false, error: 'Bundle not found' });
    }

    if (bundle.communitiesUsed >= bundle.communitiesIncluded) {
      return res.status(400).json({ ok: false, error: 'Bundle is at capacity' });
    }

    // Check if community already has an active individual subscription
    const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (existingSubscription && existingSubscription.plan === 'monthly' && 
        ['active', 'trialing'].includes(existingSubscription.status)) {
      // Cancel the individual Stripe subscription
      if (existingSubscription.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
            metadata: {
              cancelReason: 'migrating_to_bundle'
            }
          });
        } catch (error: any) {
          console.error('Failed to cancel individual subscription:', error);
          // Continue anyway - we'll handle this in webhooks
        }
      }
    }

    // Assign community to bundle
    await communitiesStorage.assignCommunityToBundle(communityId, bundleId);

    res.json({ ok: true, message: 'Community assigned to bundle successfully' });
  } catch (error: any) {
    console.error('Assign to bundle error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to assign to bundle' });
  }
});

/**
 * POST /api/billing/remove-from-bundle
 * Remove a community from a bundle
 */
router.post('/remove-from-bundle', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId, bundleId } = req.body;
    const user = (req as any).user;

    if (!communityId || !bundleId) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // Verify ownership
    const community = await communitiesStorage.getCommunityById(communityId);
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    
    if (!community || !organizer || community.organizerId !== organizer.id) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    // Remove from bundle
    await communitiesStorage.removeCommunityFromBundle(communityId, bundleId);

    res.json({ ok: true, message: 'Community removed from bundle successfully' });
  } catch (error: any) {
    console.error('Remove from bundle error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to remove from bundle' });
  }
});

export default router;