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
    const subtotalCents = items.reduce((sum, item) => 
      sum + (item.tier.priceCents * item.quantity), 0
    ) - discountAmountCents;

    // Calculate service fee (if buyer pays)
    const feeStructure = (event.feeStructure as any) || { type: 'buyer_pays', serviceFeePercent: 5 };
    const feesCents = feeStructure.type === 'buyer_pays' 
      ? Math.round(subtotalCents * (feeStructure.serviceFeePercent / 100))
      : 0;

    // Calculate taxes
    const taxSettings = (event.taxSettings as any) || { collectTax: true, gstPercent: 5, pstPercent: 7 };
    let gstCents = 0;
    let pstCents = 0;
    
    if (taxSettings.collectTax) {
      const taxableAmount = subtotalCents + feesCents;
      gstCents = Math.round(taxableAmount * (taxSettings.gstPercent / 100));
      pstCents = event.province === 'BC' 
        ? Math.round(taxableAmount * (taxSettings.pstPercent / 100))
        : 0;
    }

    const taxCents = gstCents + pstCents;
    const totalCents = subtotalCents + feesCents + taxCents;

    return {
      subtotalCents,
      feesCents,
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
    if (!stripe || !organizer.stripeAccountId) {
      throw new Error('Stripe not configured or organizer not connected');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: `${event.title} - ${item.tier.name}`,
          description: event.summary || undefined,
        },
        unit_amount: item.tier.priceCents,
      },
      quantity: item.quantity,
    }));

    // Add service fee as a line item if buyer pays
    const feeStructure = (event.feeStructure as any) || { type: 'buyer_pays', serviceFeePercent: 5 };
    if (feeStructure.type === 'buyer_pays' && order.feesCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Service Fee',
            description: `${feeStructure.serviceFeePercent}% platform fee`,
          },
          unit_amount: order.feesCents,
        },
        quantity: 1,
      });
    }

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

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
        customer_email: order.buyerEmail,
        metadata: metadata as any,
        // Application fee for platform (if organizer absorbs fee)
        payment_intent_data: feeStructure.type === 'organizer_absorbs' && order.feesCents > 0
          ? {
              application_fee_amount: order.feesCents,
              transfer_data: {
                destination: organizer.stripeAccountId,
              },
            }
          : undefined,
        // Direct payment to connected account
        ...(organizer.stripeAccountId && {
          stripe_account: organizer.stripeAccountId,
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