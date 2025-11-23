import type { CommunitiesSupabaseStorage } from './communities-supabase.js';

export interface CreditCheckResult {
  hasCredits: boolean;
  availableCredits: number;
  usedCredits: number;
  resetDate: string | null;
  message?: string;
}

export interface CreditDeductionResult {
  success: boolean;
  remainingCredits: number;
  message?: string;
}

export class CreditsService {
  constructor(private storage: CommunitiesSupabaseStorage) {}

  /**
   * Check if an organizer has sufficient placement credits
   * @param organizerId - The organizer's ID
   * @param creditsNeeded - Number of credits needed (1 per placement per day)
   */
  async checkCredits(organizerId: string, creditsNeeded: number = 1): Promise<CreditCheckResult> {
    try {
      // Get active subscription for the organizer
      const subscription = await this.storage.getSubscriptionByOrganizer(organizerId);

      if (!subscription) {
        return {
          hasCredits: false,
          availableCredits: 0,
          usedCredits: 0,
          resetDate: null,
          message: 'No active subscription found'
        };
      }

      // During FREE BETA, all subscriptions have unlimited credits
      if (subscription.status === 'active' && subscription.plan === 'free') {
        return {
          hasCredits: true,
          availableCredits: 999,
          usedCredits: 0,
          resetDate: null,
          message: 'FREE BETA - unlimited credits'
        };
      }

      const available = subscription.placementCreditsAvailable || 0;
      const used = subscription.placementCreditsUsed || 0;
      const remaining = available - used;

      return {
        hasCredits: remaining >= creditsNeeded,
        availableCredits: remaining,
        usedCredits: used,
        resetDate: subscription.creditsResetDate || null,
        message: remaining >= creditsNeeded 
          ? undefined 
          : `Insufficient credits. You have ${remaining} credits remaining but need ${creditsNeeded}.`
      };
    } catch (error) {
      console.error('Error checking credits:', error);
      return {
        hasCredits: false,
        availableCredits: 0,
        usedCredits: 0,
        resetDate: null,
        message: 'Error checking credit balance'
      };
    }
  }

  /**
   * Deduct placement credits from an organizer's subscription
   * @param organizerId - The organizer's ID
   * @param creditsToDeduct - Number of credits to deduct
   * @param campaignId - Optional campaign ID for tracking
   * @param placements - Array of placement types used
   * @param startDate - Campaign start date
   * @param endDate - Campaign end date
   */
  async deductCredits(
    organizerId: string,
    creditsToDeduct: number,
    campaignId?: string,
    placements?: string[],
    startDate?: string,
    endDate?: string
  ): Promise<CreditDeductionResult> {
    try {
      // Get active subscription
      const subscription = await this.storage.getSubscriptionByOrganizer(organizerId);

      if (!subscription) {
        return {
          success: false,
          remainingCredits: 0,
          message: 'No active subscription found'
        };
      }

      // During FREE BETA, don't actually deduct credits
      if (subscription.status === 'active' && subscription.plan === 'free') {
        // Still track usage for analytics
        if (placements && startDate && endDate) {
          await this.trackCreditUsage(
            organizerId,
            subscription.id,
            campaignId,
            placements,
            creditsToDeduct,
            startDate,
            endDate
          );
        }

        return {
          success: true,
          remainingCredits: 999,
          message: 'FREE BETA - credits not deducted'
        };
      }

      const available = subscription.placementCreditsAvailable || 0;
      const used = subscription.placementCreditsUsed || 0;
      const remaining = available - used;

      if (remaining < creditsToDeduct) {
        return {
          success: false,
          remainingCredits: remaining,
          message: `Insufficient credits. You have ${remaining} credits but need ${creditsToDeduct}.`
        };
      }

      // Update subscription credits
      const newUsed = used + creditsToDeduct;
      await this.storage.updateSubscriptionCredits(subscription.id, {
        placementCreditsUsed: newUsed
      });

      // Track credit usage
      if (placements && startDate && endDate) {
        await this.trackCreditUsage(
          organizerId,
          subscription.id,
          campaignId,
          placements,
          creditsToDeduct,
          startDate,
          endDate
        );
      }

      const newRemaining = available - newUsed;
      return {
        success: true,
        remainingCredits: newRemaining,
        message: `${creditsToDeduct} credit(s) deducted. ${newRemaining} remaining.`
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        remainingCredits: 0,
        message: 'Error deducting credits'
      };
    }
  }

  /**
   * Track credit usage in the placement_credits_usage table
   */
  private async trackCreditUsage(
    organizerId: string,
    subscriptionId: string,
    campaignId: string | undefined,
    placements: string[],
    creditsDeducted: number,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      await this.storage.recordCreditUsage({
        organizerId,
        subscriptionId,
        campaignId: campaignId || null,
        placementsUsed: placements,
        creditsDeducted,
        startDate,
        endDate,
        notes: null
      });
    } catch (error) {
      console.error('Error tracking credit usage:', error);
      // Don't throw - this is for analytics only
    }
  }

  /**
   * Reset placement credits for a subscription (called monthly on billing cycle)
   * @param subscriptionId - The subscription ID
   */
  async resetCredits(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await this.storage.getSubscriptionById(subscriptionId);

      if (!subscription) {
        console.error('Subscription not found for credit reset');
        return false;
      }

      // Reset credits to default amount (2 for monthly plan)
      const defaultCredits = 2;
      
      // Calculate next reset date (1 month from now)
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      await this.storage.updateSubscriptionCredits(subscriptionId, {
        placementCreditsAvailable: defaultCredits,
        placementCreditsUsed: 0,
        creditsResetDate: nextResetDate.toISOString()
      });

      console.log(`Credits reset for subscription ${subscriptionId}. Next reset: ${nextResetDate}`);
      return true;
    } catch (error) {
      console.error('Error resetting credits:', error);
      return false;
    }
  }

  /**
   * Get credit usage history for an organizer
   * @param organizerId - The organizer's ID
   * @param limit - Maximum number of records to return
   */
  async getCreditUsageHistory(organizerId: string, limit: number = 10) {
    try {
      return await this.storage.getCreditUsageByOrganizer(organizerId, limit);
    } catch (error) {
      console.error('Error fetching credit usage history:', error);
      return [];
    }
  }

  /**
   * Calculate credits needed for a campaign
   * @param placements - Array of placement types
   * @param durationDays - Number of days the campaign will run
   * @returns Number of credits needed
   */
  calculateCreditsNeeded(placements: string[], durationDays: number): number {
    // 1 credit = 1 placement for 1 day
    // If they use 2 placements for 1 day, that's 2 credits
    return placements.length * durationDays;
  }
}
