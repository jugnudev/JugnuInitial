import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { CommunitiesSupabaseDB } from './communities-supabase';

const router = Router();
const communitiesStorage = new CommunitiesSupabaseDB();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig || !endpointSecret) {
    console.error('Missing stripe signature or endpoint secret');
    return res.status(400).send('Webhook signature verification failed');
  }

  let event: Stripe.Event;

  try {
    // Construct the event from the raw body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log billing event for tracking
  try {
    await communitiesStorage.logBillingEvent({
      stripeEventId: event.id,
      eventType: event.type,
      data: event.data as any,
      processed: false
    });
  } catch (error) {
    console.error('Failed to log billing event:', error);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await communitiesStorage.markBillingEventProcessed(event.id);
  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    
    // Update event with error
    await communitiesStorage.updateBillingEventError(event.id, error.message);
    
    // Return 500 to retry later
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  
  if (!metadata) {
    console.error('No metadata in checkout session');
    return;
  }

  const { communityId } = metadata;

  // Create or update individual subscription
  if (!communityId) {
    console.error('No communityId in checkout session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Get the Stripe subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create/update subscription in database
  await communitiesStorage.createOrUpdateSubscription({
    communityId,
    organizerId: metadata.organizerId || '',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: subscription.items.data[0].price.id,
    plan: 'monthly',
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    trialStart: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : undefined,
    trialEnd: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : undefined,
    memberLimit: 500,
    pricePerMonth: 2000, // $20 CAD
    features: {
      customDomain: false,
      analytics: true,
      emailBlasts: false,
      prioritySupport: false
    }
  });

  console.log(`Created/updated individual subscription for community ${communityId}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  
  if (!metadata) {
    console.error('No metadata in subscription');
    return;
  }

  const { communityId } = metadata;

  if (!communityId) {
    console.error('No communityId in subscription metadata');
    return;
  }

  // Update individual subscription
  const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
  
  if (existingSubscription) {
    await communitiesStorage.updateSubscriptionStatus(
      existingSubscription.id,
      subscription.status as any,
      {
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAt: subscription.cancel_at 
          ? new Date(subscription.cancel_at * 1000).toISOString() 
          : null,
        canceledAt: subscription.canceled_at 
          ? new Date(subscription.canceled_at * 1000).toISOString() 
          : null,
      }
    );
  }
}

/**
 * Handle subscription deletion
 * This is called when a subscription is completely deleted (after grace period ends)
 * The community should be drafted (hidden from public) when this happens
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  
  if (!metadata) {
    console.error('No metadata in subscription');
    return;
  }

  const { communityId } = metadata;

  if (!communityId) {
    console.error('No communityId in subscription metadata');
    return;
  }

  // Update subscription status to canceled
  const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
  
  if (existingSubscription) {
    await communitiesStorage.updateSubscriptionStatus(
      existingSubscription.id,
      'canceled',
      {
        canceledAt: new Date().toISOString()
      }
    );
    
    // Draft the community (hide from public discovery)
    // This happens when the subscription is fully deleted (grace period ended)
    console.log(`[Webhook] Drafting community ${communityId} after subscription ended`);
    await communitiesStorage.updateCommunity(communityId, {
      status: 'draft'
    });
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) {
    console.error('No subscription ID in invoice');
    return;
  }

  // Get subscription to find metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata;

  if (!metadata) {
    console.error('No metadata in subscription');
    return;
  }

  const { communityId } = metadata;

  if (!communityId) {
    console.error('No communityId in subscription metadata');
    return;
  }

  // Log payment
  const payment = {
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: 'succeeded',
    description: invoice.description || 'Payment for community subscription',
    billingPeriodStart: invoice.period_start 
      ? new Date(invoice.period_start * 1000).toISOString() 
      : undefined,
    billingPeriodEnd: invoice.period_end 
      ? new Date(invoice.period_end * 1000).toISOString() 
      : undefined,
    receiptUrl: invoice.hosted_invoice_url || undefined,
    metadata: { type: 'individual' }
  };

  const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
  if (existingSubscription) {
    await communitiesStorage.createPayment({
      ...payment,
      subscriptionId: existingSubscription.id,
      communityId
    });
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) {
    console.error('No subscription ID in invoice');
    return;
  }

  // Get subscription to find metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata;

  if (!metadata) {
    console.error('No metadata in subscription');
    return;
  }

  const { communityId } = metadata;

  if (!communityId) {
    console.error('No communityId in subscription metadata');
    return;
  }

  // Log failed payment
  const payment = {
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amountPaid: 0,
    currency: invoice.currency.toUpperCase(),
    status: 'failed',
    description: invoice.description || 'Failed payment for community subscription',
    billingPeriodStart: invoice.period_start 
      ? new Date(invoice.period_start * 1000).toISOString() 
      : undefined,
    billingPeriodEnd: invoice.period_end 
      ? new Date(invoice.period_end * 1000).toISOString() 
      : undefined,
    failureReason: 'Payment failed',
    metadata: { type: 'individual' }
  };

  const existingSubscription = await communitiesStorage.getSubscriptionByCommunityId(communityId);
  if (existingSubscription) {
    await communitiesStorage.createPayment({
      ...payment,
      subscriptionId: existingSubscription.id,
      communityId
    });
    
    // Update subscription status to past_due
    await communitiesStorage.updateSubscriptionStatus(
      existingSubscription.id,
      'past_due'
    );
  }
}

export default router;