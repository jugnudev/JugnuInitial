import { CommunitiesSupabaseDB } from './communities-supabase';

const communitiesStorage = new CommunitiesSupabaseDB();

/**
 * Check and update community status based on organizer subscription
 * Communities are active when organizer has active subscription, draft otherwise
 */
async function checkOrganizerSubscriptions(): Promise<{ drafted: number; activated: number }> {
  let draftedCount = 0;
  let activatedCount = 0;
  const now = new Date();
  
  try {
    // Get all organizer subscriptions
    const organizerSubscriptions = await communitiesStorage.getAllOrganizerSubscriptions();
    
    for (const subscription of organizerSubscriptions) {
      const communities = await communitiesStorage.getCommunitiesByOrganizerId(subscription.organizerId);
      
      // Check if organizer subscription is active - should activate all draft communities
      const isSubscriptionActive = subscription.status === 'active' || 
        (subscription.status === 'trialing' && subscription.trialEnd && new Date(subscription.trialEnd) > now);
      
      if (isSubscriptionActive) {
        // Activate any draft communities for this organizer
        for (const community of communities) {
          if (community.status === 'draft') {
            console.log(`[Subscription Scheduler] Activating community ${community.name} - organizer subscription active`);
            await communitiesStorage.updateCommunity(community.id, { status: 'active' });
            activatedCount++;
          }
        }
        continue;
      }
      
      // Check if subscription has expired and should draft all communities
      let shouldDraftAll = false;
      let reason = '';
      
      if (subscription.status === 'canceled') {
        const periodEnd = subscription.currentPeriodEnd 
          ? new Date(subscription.currentPeriodEnd) 
          : null;
        
        if (!periodEnd || periodEnd <= now) {
          shouldDraftAll = true;
          reason = 'organizer subscription canceled and grace period ended';
        }
      }
      
      if (subscription.status === 'trialing' && subscription.trialEnd) {
        const trialEnd = new Date(subscription.trialEnd);
        if (trialEnd <= now) {
          shouldDraftAll = true;
          reason = 'organizer trial period ended';
        }
      }
      
      if (subscription.status === 'incomplete') {
        const createdAt = new Date(subscription.createdAt);
        const incompleteDeadline = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        if (incompleteDeadline <= now) {
          shouldDraftAll = true;
          reason = 'organizer subscription incomplete for 14+ days';
        }
      }
      
      if (subscription.status === 'past_due' || subscription.status === 'expired') {
        shouldDraftAll = true;
        reason = `organizer subscription ${subscription.status}`;
      }
      
      if (shouldDraftAll) {
        for (const community of communities) {
          if (community.status === 'active') {
            console.log(`[Subscription Scheduler] Drafting community ${community.name} - ${reason}`);
            await communitiesStorage.updateCommunity(community.id, { status: 'draft' });
            draftedCount++;
          }
        }
      }
    }
  } catch (error) {
    console.error('[Subscription Scheduler] Error checking organizer subscriptions:', error);
  }
  
  return { drafted: draftedCount, activated: activatedCount };
}

/**
 * Check legacy community subscriptions for expiration (backward compatibility)
 */
async function checkLegacySubscriptions(): Promise<number> {
  let draftedCount = 0;
  const now = new Date();
  
  try {
    const subscriptions = await communitiesStorage.getAllSubscriptions();
    
    for (const subscription of subscriptions) {
      const community = await communitiesStorage.getCommunityById(subscription.communityId);
      if (!community || community.status !== 'active') {
        continue;
      }
      
      // Skip communities whose organizers have migrated to organizer subscription
      const organizerSub = await communitiesStorage.getOrganizerSubscription(community.organizerId);
      if (organizerSub) {
        // Community is managed by organizer subscription now, skip legacy check
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
      
      // Case 3: Incomplete subscription - payment was never confirmed
      if (subscription.status === 'incomplete' && subscription.stripeSubscriptionId) {
        const createdAt = new Date(subscription.createdAt);
        const incompleteDeadline = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        if (incompleteDeadline <= now) {
          shouldDraft = true;
          reason = 'subscription incomplete - payment never confirmed within 14 days';
        }
      }
      
      // Case 4: Trialing subscription with no payment method and trial ended
      if (subscription.status === 'trialing' && subscription.trialEnd) {
        const trialEnd = new Date(subscription.trialEnd);
        if (trialEnd <= now) {
          shouldDraft = true;
          reason = 'trial period ended without active payment';
        }
      }
      
      if (shouldDraft) {
        console.log(`[Subscription Scheduler] Drafting community ${subscription.communityId} - ${reason}`);
        await communitiesStorage.updateCommunity(subscription.communityId, { status: 'draft' });
        draftedCount++;
      }
    }
  } catch (error) {
    console.error('[Subscription Scheduler] Error checking legacy subscriptions:', error);
  }
  
  return draftedCount;
}

export async function checkExpiredSubscriptions(): Promise<void> {
  try {
    console.log('[Subscription Scheduler] Checking for expired subscriptions...');
    
    // Check organizer subscriptions first (new model)
    const organizerResult = await checkOrganizerSubscriptions();
    
    // Check legacy community subscriptions (backward compatibility)
    const legacyDrafted = await checkLegacySubscriptions();
    
    const totalDrafted = organizerResult.drafted + legacyDrafted;
    const totalActivated = organizerResult.activated;
    
    if (totalDrafted > 0 || totalActivated > 0) {
      console.log(`[Subscription Scheduler] Changes: ${totalDrafted} communities drafted, ${totalActivated} communities activated`);
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
