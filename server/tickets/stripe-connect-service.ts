import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' })
  : null;

export interface ConnectAccountStatus {
  accountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

export class StripeConnectService {
  /**
   * Create a new Stripe Connect Express account for an organizer
   */
  static async createConnectAccount(params: {
    email: string;
    businessName?: string;
    country?: string;
    businessType?: 'individual' | 'company';
  }): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const account = await stripe.accounts.create({
      type: 'express', // Express accounts for quick onboarding
      country: params.country || 'CA', // Canada by default
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: params.businessType || 'individual', // Default to 'individual' for easier onboarding (SIN + bank info only)
      ...(params.businessName && {
        business_profile: {
          name: params.businessName,
        },
      }),
    });

    return account.id;
  }

  /**
   * Create an onboarding link for Connect account setup
   */
  static async createAccountLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const accountLink = await stripe.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Create a login link for existing Connect accounts to access their Stripe Dashboard
   */
  static async createLoginLink(accountId: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  }

  /**
   * Retrieve the status of a Connect account
   */
  static async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      onboardingComplete: account.charges_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
      },
    };
  }

  /**
   * Update Connect account based on webhook events
   */
  static async handleAccountUpdate(accountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    onboardingComplete: boolean;
  }> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const account = await stripe.accounts.retrieve(accountId);

    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: account.charges_enabled,
    };
  }

  /**
   * Delete a Connect account (for testing or cleanup)
   */
  static async deleteAccount(accountId: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    await stripe.accounts.del(accountId);
  }

  /**
   * Verify webhook signature for Connect webhooks
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event | null {
    if (!stripe || !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
      console.warn('Stripe Connect webhook verification skipped - no secret configured');
      return null;
    }

    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }
}
