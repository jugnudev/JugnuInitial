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

    res.json({
      ok: true,
      subscription: {
        ...subscription,
        payments: canManage ? payments : [],
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
      canceledAt: new Date().toISOString()
    });

    res.json({ ok: true, message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to cancel subscription' });
  }
});

export default router;