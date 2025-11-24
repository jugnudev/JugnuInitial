import { useQuery } from '@tanstack/react-query';

interface Subscription {
  id: string;
  communityId: string;
  status: 'trialing' | 'active' | 'inactive';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  placementCredits: number;
  creditsResetDate: string | null;
}

interface SubscriptionStatusData {
  subscription: Subscription | null;
  availableCredits: number;
  canManage: boolean;
}

export interface SubscriptionStatusResult {
  subscription: Subscription | null;
  isTrialing: boolean;
  isActive: boolean;
  isInactive: boolean;
  trialDaysRemaining: number | null;
  availableCredits: number;
  canManage: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and track subscription status for a community
 * Returns trial status, days remaining, credits, and other billing info
 */
export function useSubscriptionStatus(communityId: string | undefined | null): SubscriptionStatusResult {
  const { data, isLoading, error } = useQuery<{ ok: boolean } & SubscriptionStatusData>({
    queryKey: [`/api/billing/subscription/${communityId}`],
    enabled: !!communityId,
    retry: 1,
  });

  const subscription = data?.subscription ?? null;
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isInactive = subscription?.status === 'inactive' || !subscription;

  // Calculate trial days remaining
  const trialDaysRemaining = subscription?.trialEndsAt && isTrialing
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    subscription,
    isTrialing,
    isActive,
    isInactive,
    trialDaysRemaining,
    availableCredits: data?.availableCredits ?? 0,
    canManage: data?.canManage ?? false,
    isLoading,
    error: error as Error | null,
  };
}
