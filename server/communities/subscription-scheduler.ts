import { CommunitiesSupabaseDB } from './communities-supabase';

const communitiesStorage = new CommunitiesSupabaseDB();

export async function checkExpiredSubscriptions(): Promise<void> {
  try {
    console.log('[Subscription Scheduler] Checking for expired subscriptions...');
    
    const subscriptions = await communitiesStorage.getAllSubscriptions();
    const now = new Date();
    let draftedCount = 0;
    
    for (const subscription of subscriptions) {
      const community = await communitiesStorage.getCommunityById(subscription.communityId);
      if (!community || community.status !== 'active') {
        continue;
      }
      
      let shouldDraft = false;
      let reason = '';
      
      // Case 1: Canceled subscription - check if grace period ended
      if (subscription.status === 'canceled') {
        const periodEnd = subscription.currentPeriodEnd 
          ? new Date(subscription.currentPeriodEnd) 
          : null;
        
        if (!periodEnd || periodEnd <= now) {
          shouldDraft = true;
          reason = 'subscription canceled and grace period ended';
        }
      }
      
      // Case 2: Platform trial expired (no Stripe subscription set up within 14 days)
      if (!subscription.stripeSubscriptionId && subscription.status !== 'canceled') {
        const createdAt = new Date(subscription.createdAt);
        const platformTrialEnd = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        if (platformTrialEnd <= now) {
          shouldDraft = true;
          reason = 'platform trial expired without payment setup';
        }
      }
      
      if (shouldDraft) {
        console.log(`[Subscription Scheduler] Drafting community ${subscription.communityId} - ${reason}`);
        
        await communitiesStorage.updateCommunity(subscription.communityId, {
          status: 'draft'
        });
        
        draftedCount++;
      }
    }
    
    if (draftedCount > 0) {
      console.log(`[Subscription Scheduler] Drafted ${draftedCount} communities with ended subscriptions`);
    } else {
      console.log('[Subscription Scheduler] No communities to draft');
    }
  } catch (error) {
    console.error('[Subscription Scheduler] Error checking expired subscriptions:', error);
  }
}

export function startSubscriptionScheduler(): void {
  console.log('[Subscription Scheduler] Starting subscription scheduler...');
  
  checkExpiredSubscriptions();
  
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  setInterval(checkExpiredSubscriptions, FOUR_HOURS);
  
  console.log('[Subscription Scheduler] Scheduler started - checking every 4 hours');
}
