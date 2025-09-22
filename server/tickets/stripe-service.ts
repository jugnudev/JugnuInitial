import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import type { 
  TicketsEvent, 
  TicketsOrder, 
  TicketsTier,
  TicketsOrganizer 
} from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not found - Stripe integration disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

export interface CheckoutSessionMetadata {
  orderId: string;
  eventId: string;
  organizerId: string;
  buyerEmail: string;
  buyerName?: string;
  tierInfo: string; // JSON stringified tier quantities
}

export interface CalculatedPricing {
  subtotalCents: number;
  feesCents: number;
  taxCents: number;
  totalCents: number;
  taxBreakdown: {
    gstCents: number;
    pstCents: number;
  };
}

export class StripeService {
  /**
   * Calculate fees and taxes for an order
   */
  static calculatePricing(
    items: Array<{ tier: TicketsTier; quantity: number }>,
    event: TicketsEvent,
    discountAmountCents: number = 0
  ): CalculatedPricing {
    // Calculate subtotal
    const rawSubtotalCents = items.reduce((sum, item) => {
      // Handle both camelCase and snake_case field names for database compatibility
      let priceInCents = item.tier.priceCents;
      if (priceInCents === undefined) {
        // Fallback to snake_case if camelCase field is missing
        priceInCents = (item.tier as any).price_cents;
      }
      
      const itemTotal = priceInCents * item.quantity;
      return sum + itemTotal;
    }, 0);
    
    console.log('Raw subtotal cents:', rawSubtotalCents);
    
    // Clamp discount to prevent negative totals
    const effectiveDiscountCents = Math.min(discountAmountCents, rawSubtotalCents);
    const subtotalCents = Math.max(0, rawSubtotalCents - effectiveDiscountCents);

    // Calculate platform fee (always 2.5% + $0.50 per ticket for platform)
    const ticketCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const feesCents = Math.round(subtotalCents * 0.025 + ticketCount * 50);

    // Calculate taxes on subtotal (not including platform fee)
    const taxSettings = (event.taxSettings as any) || { collectTax: true, gstPercent: 5, pstPercent: 7 };
    let gstCents = 0;
    let pstCents = 0;
    
    if (taxSettings.collectTax) {
      gstCents = Math.round(subtotalCents * (taxSettings.gstPercent / 100));
      pstCents = event.province === 'BC' 
        ? Math.round(subtotalCents * (taxSettings.pstPercent / 100))
        : 0;
    }

    const taxCents = gstCents + pstCents;
    // Total charged to customer (subtotal + tax, platform fee handled via application_fee_amount)
    const totalCents = subtotalCents + taxCents;

    return {
      subtotalCents,
      feesCents, // Platform's application fee, not added to total
      taxCents,
      totalCents,
      taxBreakdown: {
        gstCents,
        pstCents
      }
    };
  }

  /**
   * Create a Stripe Checkout Session for ticket purchase
   */
  static async createCheckoutSession(
    event: TicketsEvent,
    organizer: TicketsOrganizer,
    items: Array<{ tier: TicketsTier; quantity: number }>,
    order: TicketsOrder,
    returnUrl: string
  ): Promise<Stripe.Checkout.Session | null> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => {
      const priceInCents = item.tier.priceCents;
      if (!priceInCents || priceInCents <= 0) {
        throw new Error(`Invalid price for tier ${item.tier.name}: ${priceInCents}`);
      }
      
      return {
        price_data: {
          currency: 'cad',
          product_data: {
            name: `${event.title} - ${item.tier.name}`,
            description: event.summary || undefined,
          },
          unit_amount: priceInCents,
        },
        quantity: item.quantity,
      };
    });

    // Do not add service fee as a line item - use application_fee_amount instead

    // Create metadata for webhook processing
    const metadata: CheckoutSessionMetadata = {
      orderId: order.id,
      eventId: event.id,
      organizerId: organizer.id,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName || '',
      tierInfo: JSON.stringify(items.map(item => ({
        tierId: item.tier.id,
        quantity: item.quantity,
        unitPriceCents: item.tier.priceCents
      })))
    };

    // Calculate pricing to get tax amounts
    const pricing = StripeService.calculatePricing(items, event, 0);
    
    // Add tax as a separate line item since we're handling taxes manually
    const taxLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (pricing.taxCents > 0) {
      taxLineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Taxes',
            description: `GST/PST for ${event.title}`,
          },
          unit_amount: pricing.taxCents,
        },
        quantity: 1,
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [...lineItems, ...taxLineItems],
        mode: 'payment',
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${returnUrl}?cancelled=true`,
        customer_email: order.buyerEmail,
        metadata: metadata as any,
        // Use direct charges if no connected account, otherwise use destination charges
        ...(organizer.stripeAccountId ? {
          payment_intent_data: {
            application_fee_amount: order.feesCents, // Platform gets this fee
            transfer_data: {
              destination: organizer.stripeAccountId,
            },
          },
        } : {
          // Direct charge - platform keeps all fees
        }),
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe Connect onboarding link for an organizer
   */
  static async createConnectOnboardingLink(
    organizerId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string | null> {
    if (!stripe) return null;

    try {
      // Create a Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organizerId
        }
      });

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Error creating Connect onboarding:', error);
      throw error;
    }
  }

  /**
   * Process a refund for an order or specific tickets
   */
  static async processRefund(
    order: TicketsOrder,
    amountCents: number,
    reason?: string
  ): Promise<Stripe.Refund | null> {
    if (!stripe || !order.stripePaymentIntentId) return null;

    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: amountCents,
        reason: 'requested_by_customer',
        metadata: {
          orderId: order.id,
          refundReason: reason || 'Customer requested'
        }
      });

      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Create a Payment Intent for embedded checkout
   */
  static async createPaymentIntent(
    items: Array<{ tier: TicketsTier; quantity: number }>,
    event: TicketsEvent,
    organizer: TicketsOrganizer,
    order: TicketsOrder
  ): Promise<Stripe.PaymentIntent | null> {
    if (!stripe) return null;

    console.log('[StripeService] Creating Payment Intent for embedded checkout');
    console.log('- Order ID:', order.id);
    console.log('- Event ID:', event.id);
    console.log('- Organizer ID:', organizer.id);
    console.log('- Has Stripe Connect:', !!organizer.stripeAccountId);

    try {
      // Calculate pricing
      const pricing = StripeService.calculatePricing(items, event, 0);
      
      // Create metadata for payment processing
      const metadata: CheckoutSessionMetadata = {
        orderId: order.id,
        eventId: event.id,
        organizerId: organizer.id,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName || '',
        tierInfo: JSON.stringify(items.map(item => ({
          tierId: item.tier.id,
          quantity: item.quantity,
          unitPriceCents: item.tier.priceCents
        })))
      };

      // Create Payment Intent with marketplace flow or direct charge
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: pricing.totalCents,
        currency: 'cad',
        payment_method_types: ['card'],
        metadata: metadata as any,
        description: `Tickets for ${event.title}`,
        receipt_email: order.buyerEmail,
        // Hold funds until after event for marketplace model
        capture_method: 'automatic',
        // Use confirmation_method: 'automatic' to allow frontend confirmation
        confirmation_method: 'automatic'
      };

      // Add marketplace flow if organizer has Stripe Connect
      if (organizer.stripeAccountId) {
        console.log('[StripeService] Using marketplace model with Stripe Connect');
        paymentIntentParams.application_fee_amount = order.feesCents;
        paymentIntentParams.transfer_data = {
          destination: organizer.stripeAccountId,
        };
        paymentIntentParams.on_behalf_of = organizer.stripeAccountId;
      } else {
        console.log('[StripeService] Using direct charge model (no Connect account)');
        // Direct charge - platform keeps all money including fees
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      console.log('[StripeService] Payment Intent created:', paymentIntent.id);
      return paymentIntent;
    } catch (error) {
      console.error('[StripeService] Error creating Payment Intent:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event | null {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;

    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }
}