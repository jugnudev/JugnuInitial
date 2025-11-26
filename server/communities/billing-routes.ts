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
    console.error('[Billing Auth] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    return res.status(500).json({ ok: false, error: 'Authentication failed' });
  }
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

// Pricing configuration - priceId will be resolved dynamically if not set
const PRICING = {
  individual: {
    monthly: {
      priceId: process.env.STRIPE_PRICE_COMMUNITY_MONTHLY || null, // Will be created if null
      amount: 5000, // $50 CAD in cents
      currency: 'cad',
      placementCredits: 2 // Number of ad placement credits per billing cycle
    }
  }
};

// Cache for dynamically created Stripe price ID
let cachedPriceId: string | null = null;

/**
 * Get or create the Stripe price for community subscriptions
 * This ensures we have a valid price ID even if not configured via environment variable
 */
async function getOrCreateCommunityPrice(): Promise<string> {
  // Return cached price if available
  if (cachedPriceId) {
    return cachedPriceId;
  }
  
  // Return environment-configured price if set
  if (PRICING.individual.monthly.priceId) {
    cachedPriceId = PRICING.individual.monthly.priceId;
    return cachedPriceId;
  }
  
  console.log('[Billing] No price ID configured, searching for existing Jugnu product...');
  
  // Search for existing Jugnu product
  const existingProducts = await stripe.products.list({
    active: true,
    limit: 100
  });
  
  let jognuProduct = existingProducts.data.find(p => 
    p.name === 'Jugnu Community Subscription' || 
    p.metadata?.jugnu_community === 'true'
  );
  
  // Create product if it doesn't exist
  if (!jognuProduct) {
    console.log('[Billing] Creating Jugnu Community product in Stripe...');
    jognuProduct = await stripe.products.create({
      name: 'Jugnu Community Subscription',
      description: 'Monthly subscription for Jugnu community platform - $50/month flat fee, 0% commission on tickets, includes 2 monthly placement credits',
      metadata: {
        jugnu_community: 'true',
        plan_type: 'individual'
      }
    });
    console.log('[Billing] Created product:', jognuProduct.id);
  }
  
  // Search for existing price on this product
  const existingPrices = await stripe.prices.list({
    product: jognuProduct.id,
    active: true,
    limit: 10
  });
  
  let monthlyPrice = existingPrices.data.find(p => 
    p.recurring?.interval === 'month' && 
    p.unit_amount === 5000 && 
    p.currency === 'cad'
  );
  
  // Create price if it doesn't exist
  if (!monthlyPrice) {
    console.log('[Billing] Creating $50 CAD/month price in Stripe...');
    monthlyPrice = await stripe.prices.create({
      product: jognuProduct.id,
      unit_amount: 5000, // $50 CAD in cents
      currency: 'cad',
      recurring: {
        interval: 'month'
      },
      metadata: {
        jugnu_plan: 'community_monthly',
        placement_credits: '2'
      }
    });
    console.log('[Billing] Created price:', monthlyPrice.id);
  }
  
  // Cache and return
  cachedPriceId = monthlyPrice.id;
  console.log('[Billing] Using price ID:', cachedPriceId);
  return cachedPriceId;
}

/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for individual community subscription
 * Supports both embedded mode (ui_mode: 'embedded') and redirect mode
 */
router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { communityId, embedded } = req.body;
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

    // Check if already has a subscription with valid Stripe setup
    const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
    if (existingSubscription) {
      // Block if subscription already has a Stripe subscription ID (already on Stripe)
      // This prevents double billing for active, past_due, or unpaid subscriptions
      if (existingSubscription.stripeSubscriptionId) {
        // Only truly cancelled subscriptions can restart via checkout
        if (existingSubscription.status !== 'canceled') {
          console.log('[Billing] Blocking checkout - subscription already exists on Stripe:', {
            status: existingSubscription.status,
            stripeSubscriptionId: existingSubscription.stripeSubscriptionId
          });
          return res.status(400).json({ 
            ok: false, 
            error: existingSubscription.status === 'active' 
              ? 'Community already has an active subscription' 
              : 'Community has a subscription that needs attention. Please contact support.'
          });
        }
      }
      // Allow checkout for subscriptions without Stripe setup (incomplete trial, needs payment)
      console.log('[Billing] Allowing checkout for incomplete subscription:', {
        status: existingSubscription.status,
        hasStripeSubscription: !!existingSubscription.stripeSubscriptionId,
        reason: 'No Stripe subscription ID - needs to complete checkout'
      });
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

    // Get or create the Stripe price
    const priceId = await getOrCreateCommunityPrice();
    const metadata = {
      type: 'individual',
      communityId,
      userId: user.id
    };

    const baseUrl = process.env.VITE_APP_URL || 'http://localhost:5000';

    // Create Stripe checkout session - embedded or redirect mode
    if (embedded) {
      // Embedded mode - displays checkout form directly on your page
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        ui_mode: 'embedded',
        return_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
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
        clientSecret: session.client_secret,
        sessionId: session.id
      });
    } else {
      // Redirect mode - opens Stripe hosted checkout in new tab/window
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/billing/cancelled`,
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
    }
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * Subscription State Machine:
 * 
 * 1. platform_trial - Initial 14-day trial when community is created (no Stripe setup yet)
 *    - Community has full platform access
 *    - No placement credits
 *    - User should see "14-day platform trial" messaging
 *    - Community should be public (discovery)
 * 
 * 2. stripe_trial - Stripe's 14-day trial after completing checkout (no charge yet)
 *    - User has set up payment method
 *    - First charge will occur after 14 days
 *    - Gets placement credits
 *    - Community is fully active
 * 
 * 3. active - Fully paid subscription
 *    - Billing is active
 *    - Gets placement credits
 *    - Community is fully active
 * 
 * 4. grace_period - Subscription canceled but still within billing period
 *    - User canceled, but access continues until currentPeriodEnd
 *    - Still has access to features
 *    - After grace period, moves to 'ended'
 * 
 * 5. ended - Subscription ended, community should be drafted
 *    - Access is revoked
 *    - Community should be hidden from public
 */
type SubscriptionState = 'platform_trial' | 'stripe_trial' | 'active' | 'grace_period' | 'past_due' | 'ended' | 'none';

function computeSubscriptionState(subscription: any): { 
  state: SubscriptionState; 
  accessExpiresAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  platformTrialDaysRemaining: number | null;
  isPublicAllowed: boolean;
  hasFullAccess: boolean;
} {
  const now = new Date();
  const hasStripeSubscription = !!subscription.stripeSubscriptionId;
  
  // Case 1: No Stripe subscription = platform trial or ended
  if (!hasStripeSubscription) {
    // Check if this subscription was canceled (not just missing Stripe setup)
    if (subscription.status === 'canceled') {
      return {
        state: 'ended',
        accessExpiresAt: null,
        trialEndsAt: null,
        trialDaysRemaining: null,
        platformTrialDaysRemaining: null,
        isPublicAllowed: false,
        hasFullAccess: false
      };
    }
    
    // Calculate platform trial end (14 days from creation)
    const createdAt = new Date(subscription.createdAt);
    const platformTrialEnd = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000));
    const platformTrialDaysRemaining = Math.max(0, Math.ceil((platformTrialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // If platform trial has expired (0 or fewer days remaining), treat as ended
    // Use <= to handle the edge case where platformTrialEnd === now
    if (platformTrialEnd <= now) {
      return {
        state: 'ended',
        accessExpiresAt: platformTrialEnd.toISOString(),
        trialEndsAt: platformTrialEnd.toISOString(),
        trialDaysRemaining: null,
        platformTrialDaysRemaining: 0,
        isPublicAllowed: false, // Hide from discovery after trial expires
        hasFullAccess: false // No access after trial expires
      };
    }
    
    // Platform trial still active
    return {
      state: 'platform_trial',
      accessExpiresAt: platformTrialEnd.toISOString(),
      trialEndsAt: platformTrialEnd.toISOString(),
      trialDaysRemaining: null,
      platformTrialDaysRemaining,
      isPublicAllowed: true, // Allow discovery during trial
      hasFullAccess: true // Full platform access during trial
    };
  }
  
  // Case 2: Has Stripe subscription - check status
  const status = subscription.status;
  
  // Stripe trial (first 14 days after checkout, no charge yet)
  if (status === 'trialing') {
    const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
    const trialDaysRemaining = trialEnd 
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    
    return {
      state: 'stripe_trial',
      accessExpiresAt: null, // No access expiration during trial
      trialEndsAt: trialEnd?.toISOString() || null,
      trialDaysRemaining,
      platformTrialDaysRemaining: null,
      isPublicAllowed: true,
      hasFullAccess: true
    };
  }
  
  // Active subscription
  if (status === 'active') {
    // Check if cancellation has been requested (cancel_at_period_end=true in Stripe)
    // This is detected by: cancelAt being set, or canceledAt being set
    const hasCancelRequest = subscription.cancelAt || subscription.canceledAt;
    
    if (hasCancelRequest) {
      // Use cancelAt (from Stripe current_period_end) or currentPeriodEnd
      const periodEnd = subscription.cancelAt 
        ? new Date(subscription.cancelAt) 
        : (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null);
      
      if (periodEnd && periodEnd > now) {
        // Still in grace period - access continues until period end
        return {
          state: 'grace_period',
          accessExpiresAt: periodEnd.toISOString(),
          trialEndsAt: null,
          trialDaysRemaining: null,
          platformTrialDaysRemaining: null,
          isPublicAllowed: true,
          hasFullAccess: true
        };
      }
      
      // Grace period has ended
      return {
        state: 'ended',
        accessExpiresAt: periodEnd?.toISOString() || null,
        trialEndsAt: null,
        trialDaysRemaining: null,
        platformTrialDaysRemaining: null,
        isPublicAllowed: false,
        hasFullAccess: false
      };
    }
    
    return {
      state: 'active',
      accessExpiresAt: null,
      trialEndsAt: null,
      trialDaysRemaining: null,
      platformTrialDaysRemaining: null,
      isPublicAllowed: true,
      hasFullAccess: true
    };
  }
  
  // Past due - payment failed
  if (status === 'past_due') {
    return {
      state: 'past_due',
      accessExpiresAt: subscription.currentPeriodEnd || null,
      trialEndsAt: null,
      trialDaysRemaining: null,
      platformTrialDaysRemaining: null,
      isPublicAllowed: true, // Keep visible while resolving payment
      hasFullAccess: true // Usually still has access during past_due
    };
  }
  
  // Canceled subscription
  if (status === 'canceled') {
    // Check if still within period (Stripe might keep it active until period end)
    const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
    if (periodEnd && periodEnd > now) {
      return {
        state: 'grace_period',
        accessExpiresAt: periodEnd.toISOString(),
        trialEndsAt: null,
        trialDaysRemaining: null,
        platformTrialDaysRemaining: null,
        isPublicAllowed: true,
        hasFullAccess: true
      };
    }
    
    // Grace period ended
    return {
      state: 'ended',
      accessExpiresAt: periodEnd?.toISOString() || null,
      trialEndsAt: null,
      trialDaysRemaining: null,
      platformTrialDaysRemaining: null,
      isPublicAllowed: false, // Community should be hidden
      hasFullAccess: false
    };
  }
  
  // Other states (paused, expired, etc.)
  return {
    state: 'ended',
    accessExpiresAt: null,
    trialEndsAt: null,
    trialDaysRemaining: null,
    platformTrialDaysRemaining: null,
    isPublicAllowed: false,
    hasFullAccess: false
  };
}

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
        subscriptionState: 'none' as SubscriptionState,
        canManage: false
      });
    }

    // Compute the unified subscription state
    const stateInfo = computeSubscriptionState(subscription);
    
    // SYNCHRONOUS DRAFTING: If state is 'ended' and community is still active, draft it now
    // This ensures we don't wait for the scheduler to run
    let updatedCommunityStatus = community.status;
    if (stateInfo.state === 'ended' && community.status === 'active') {
      console.log(`[Billing] Synchronously drafting community ${communityId} - subscription state is 'ended'`);
      await communitiesStorage.updateCommunity(communityId, { status: 'draft' });
      updatedCommunityStatus = 'draft';
    }
    
    // Clamp platformTrialDaysRemaining to 0 when state is 'ended' to avoid rounding artifacts
    const finalPlatformTrialDaysRemaining = stateInfo.state === 'ended' ? 0 : stateInfo.platformTrialDaysRemaining;
    
    // Detect Stripe setup status for UI purposes
    const hasStripeCustomer = !!subscription.stripeCustomerId;
    const hasStripeSubscription = !!subscription.stripeSubscriptionId;
    const isIncompleteSetup = !hasStripeSubscription;
    
    // For backward compatibility with existing UI
    const isEffectivelyTrialing = stateInfo.state === 'platform_trial' || stateInfo.state === 'stripe_trial';

    // Check if user can manage billing
    const organizer = await communitiesStorage.getOrganizerByUserId(user.id);
    const canManage = organizer && community.organizerId === organizer.id;

    // Get payment history if owner
    let payments: any[] = [];
    if (canManage && subscription.id) {
      payments = await communitiesStorage.getPaymentsBySubscriptionId(subscription.id);
    }

    // Get credits balance for active subscriptions WITH Stripe subscription
    // Credits only available for paid subscriptions (active or stripe_trial)
    let creditsAvailable = 0;
    if (hasStripeSubscription && (stateInfo.state === 'active' || stateInfo.state === 'stripe_trial') && subscription.organizerId) {
      const creditCheck = await creditsService.checkCredits(subscription.organizerId, 0);
      creditsAvailable = creditCheck.availableCredits;
    }

    res.json({
      ok: true,
      subscription: {
        ...subscription,
        payments: canManage ? payments : [],
        canManage,
        // Stripe setup flags
        hasStripeCustomer,
        hasStripeSubscription,
        isIncompleteSetup,
        // Trial flags (backward compatibility)
        isEffectivelyTrialing,
        trialEndsAt: stateInfo.trialEndsAt,
        trialDaysRemaining: stateInfo.trialDaysRemaining,
        // New unified state info
        subscriptionState: stateInfo.state,
        platformTrialDaysRemaining: finalPlatformTrialDaysRemaining,
        accessExpiresAt: stateInfo.accessExpiresAt,
        isPublicAllowed: stateInfo.isPublicAllowed,
        hasFullAccess: stateInfo.hasFullAccess,
        // Include updated community status so clients get consistent state
        communityStatus: updatedCommunityStatus
      },
      subscriptionState: stateInfo.state,
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
 * 
 * IMPORTANT: Uses cancel_at_period_end for grace period:
 * - Subscription stays 'active' until billing period ends
 * - User retains full access until currentPeriodEnd
 * - After period ends, Stripe sends webhook to mark as 'canceled'
 * - Community gets drafted when subscription enters 'ended' state
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

    let accessExpiresAt: Date | null = null;

    // Cancel in Stripe with grace period (cancel at period end)
    if (subscription.stripeSubscriptionId) {
      const updatedSub = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      // Get the period end date for grace period
      // Type assertion needed as Stripe types may not expose current_period_end directly
      const periodEnd = (updatedSub as any).current_period_end;
      accessExpiresAt = new Date(periodEnd * 1000);
      
      // Update subscription with cancelAt (NOT status) - keeps it active until period end
      // Status will be changed to 'canceled' by webhook when Stripe actually cancels it
      await communitiesStorage.updateSubscriptionStatus(subscription.id, subscription.status, {
        cancelAt: accessExpiresAt,
        canceledAt: new Date()
      });
    } else {
      // No Stripe subscription - just mark as canceled immediately
      await communitiesStorage.updateSubscriptionStatus(subscription.id, 'canceled', {
        canceledAt: new Date()
      });
    }

    res.json({ 
      ok: true, 
      message: accessExpiresAt 
        ? `Subscription will be cancelled. You'll have access until ${accessExpiresAt.toLocaleDateString()}.`
        : 'Subscription cancelled successfully.',
      accessExpiresAt: accessExpiresAt?.toISOString() || null,
      gracePeriod: !!accessExpiresAt
    });
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