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
   * Get unit price in cents from a tier object, handling both camelCase and snake_case field names
   */
  static getUnitPriceCents(tier: TicketsTier): number {
    // Handle both camelCase and snake_case field names for database compatibility
    let priceInCents = tier.priceCents;
    if (priceInCents === undefined) {
      // Fallback to snake_case if camelCase field is missing
      priceInCents = (tier as any).price_cents;
    }
    
    // Ensure we have a valid price
    if (priceInCents === undefined || priceInCents === null || isNaN(priceInCents)) {
      throw new Error(`Invalid tier price: ${priceInCents} for tier ${tier.id}`);
    }
    
    return priceInCents;
  }

  /**
   * Calculate fees and taxes for an order
   * NOTE: Jugnu does NOT take platform fees - businesses keep 100% of ticket revenue
   * feesCents represents optional service fees that go directly to the business
   */
  static calculatePricing(
    items: Array<{ tier: TicketsTier; quantity: number }>,
    event: TicketsEvent,
    discountAmountCents: number = 0,
    organizer?: TicketsOrganizer
  ): CalculatedPricing {
    // Calculate subtotal
    const rawSubtotalCents = items.reduce((sum, item) => {
      const priceInCents = StripeService.getUnitPriceCents(item.tier);
      const itemTotal = priceInCents * item.quantity;
      return sum + itemTotal;
    }, 0);
    
    console.log('Raw subtotal cents:', rawSubtotalCents);
    
    // Clamp discount to prevent negative totals
    const effectiveDiscountCents = Math.min(discountAmountCents, rawSubtotalCents);
    const subtotalCents = Math.max(0, rawSubtotalCents - effectiveDiscountCents);

    // NO PLATFORM FEE - Jugnu revenue comes from subscriptions only
    // feesCents represents optional service fees that the business can set (goes to them, not Jugnu)
    const feesCents = 0; // Not used in this model

    // Calculate taxes on subtotal
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
    // Total charged to customer (subtotal + tax only, no platform fees)
    const totalCents = subtotalCents + taxCents;

    return {
      subtotalCents,
      feesCents, // Always 0 - no platform fees collected
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
      const priceInCents = StripeService.getUnitPriceCents(item.tier);
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
        unitPriceCents: StripeService.getUnitPriceCents(item.tier)
      })))
    };

    // Calculate pricing to get tax amounts
    const pricing = StripeService.calculatePricing(items, event, 0, organizer);
    
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
      // Stripe Connect Model: Direct payment to business (NO platform fees - subscription model)
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [...lineItems, ...taxLineItems],
        mode: 'payment',
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${returnUrl}?cancelled=true`,
        customer_email: order.buyerEmail,
        metadata: metadata as any,
      };

      // If organizer has Stripe Connect account, charge directly to them (100% of revenue)
      if (organizer.stripeAccountId) {
        sessionParams.payment_intent_data = {
          // NO application_fee_amount - business keeps 100% of ticket revenue
          on_behalf_of: organizer.stripeAccountId, // Charge goes to organizer's account
          transfer_data: {
            destination: organizer.stripeAccountId,
          },
        };
      }
      // Otherwise, charge to platform account (fallback for testing or incomplete onboarding)

      const session = await stripe.checkout.sessions.create(sessionParams);

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * MoR Model - No Connect onboarding needed
   * Organizers just provide payout details, Jugnu handles all payments
   */

  /**
   * Calculate actual Stripe fees from a completed charge (MoR model)
   */
  static async getStripeFees(chargeId: string): Promise<{ stripeFeeCents: number; netCents: number } | null> {
    if (!stripe) return null;

    try {
      // Get the charge to access balance transaction
      const charge = await stripe.charges.retrieve(chargeId);
      
      if (!charge.balance_transaction) {
        console.warn('No balance transaction found for charge:', chargeId);
        return null;
      }

      // Get balance transaction to see exact fees
      const balanceTransaction = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string);
      
      return {
        stripeFeeCents: balanceTransaction.fee,
        netCents: balanceTransaction.net
      };
    } catch (error) {
      console.error('Error fetching Stripe fees:', error);
      return null;
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
      const pricing = StripeService.calculatePricing(items, event, 0, organizer);
      
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
          unitPriceCents: StripeService.getUnitPriceCents(item.tier)
        })))
      };

      // Create Payment Intent with Stripe Connect flow
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: pricing.totalCents,
        currency: 'cad',
        payment_method_types: ['card'],
        metadata: metadata as any,
        description: `Tickets for ${event.title}`,
        receipt_email: order.buyerEmail,
        capture_method: 'automatic',
        confirmation_method: 'automatic'
      };

      // If organizer has Stripe Connect account, charge directly to them (100% revenue)
      if (organizer.stripeAccountId) {
        // NO application_fee_amount - business keeps all ticket revenue (Jugnu revenue from subscriptions)
        paymentIntentParams.on_behalf_of = organizer.stripeAccountId; // Charge to organizer
        paymentIntentParams.transfer_data = {
          destination: organizer.stripeAccountId,
        };
        console.log('[StripeService] Using Stripe Connect - direct charge to organizer account (no platform fees)');
      } else {
        // Fallback to platform account if onboarding not complete
        console.log('[StripeService] Using platform account - organizer onboarding incomplete');
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