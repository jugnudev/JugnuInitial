import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, CreditCard, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CustomPaymentFormWrapper } from '@/components/billing/CustomPaymentForm';

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface Subscription {
  id: string;
  status: string;
  trialEnd: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  hasStripeCustomer?: boolean;
  hasStripeSubscription?: boolean;
  isIncompleteSetup?: boolean;
  isEffectivelyTrialing?: boolean;
  subscriptionState?: 'platform_trial' | 'stripe_trial' | 'active' | 'grace_period' | 'past_due' | 'ended' | 'none';
  platformTrialDaysRemaining?: number | null;
  accessExpiresAt?: string | null;
}

export default function SubscribePage() {
  const [, params] = useRoute('/subscribe/:communityId');
  const [, navigate] = useLocation();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const communityId = params?.communityId;

  const { data: communityData, isLoading: isLoadingCommunity } = useQuery<{ ok: boolean; community: Community }>({
    queryKey: [`/api/communities/id/${communityId}`],
    enabled: !!communityId,
  });

  const { data: subscriptionData, isLoading: isLoadingSubscription, refetch: refetchSubscription } = useQuery<{ 
    ok: boolean; 
    subscription: Subscription | null;
  }>({
    queryKey: [`/api/billing/subscription/${communityId}`],
    enabled: !!communityId,
  });

  const community = communityData?.community;
  const subscription = subscriptionData?.subscription;

  useEffect(() => {
    if (subscription && 
        subscription.status === 'active' && 
        subscription.hasStripeCustomer &&
        subscription.hasStripeSubscription && 
        !subscription.isEffectivelyTrialing &&
        community?.slug) {
      toast({
        title: 'Already Subscribed',
        description: 'This community already has an active subscription.',
      });
      navigate(`/communities/${community.slug}/settings`);
    }
  }, [subscription, community, navigate]);

  const handlePaymentSuccess = () => {
    refetchSubscription();
    if (community?.slug) {
      navigate(`/communities/${community.slug}/settings`);
    }
  };

  const subscriptionState = subscription?.subscriptionState || 'none';
  const platformTrialDaysRemaining = subscription?.platformTrialDaysRemaining ?? 0;
  const stripeTrialDaysRemaining = subscription?.trialDaysRemaining ?? 0;
  const showPlatformTrialInfo = subscriptionState === 'platform_trial';
  const showStripeTrialInfo = subscriptionState === 'stripe_trial';
  const showTrialExpiredInfo = subscriptionState === 'ended';

  if (isLoadingCommunity || isLoadingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
          <p className="text-white/60">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 premium-surface">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Community Not Found</h2>
            <p className="text-white/60 mb-4">The community you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPaymentForm) {
    return (
      <>
        <Helmet>
          <title>Complete Payment - {community.name} | Jugnu</title>
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg py-12 px-4">
          <div className="max-w-lg mx-auto">
            <Button
              variant="ghost"
              onClick={() => setShowPaymentForm(false)}
              className="mb-6 text-white/70 hover:text-white"
              data-testid="button-back-to-plan"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plan Details
            </Button>

            <CustomPaymentFormWrapper
              communityId={community.id}
              communityName={community.name}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentForm(false)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscribe to {community.name} - Jugnu</title>
        <meta 
          name="description" 
          content={`Subscribe to ${community.name} for $50/month. Get full platform access, 2 monthly placement credits, and all premium features.`} 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(`/communities/${community.slug}/settings`)}
            className="mb-6 text-white/70 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>

          {showPlatformTrialInfo && (
            <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10" data-testid="card-trial-banner">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">
                      {platformTrialDaysRemaining > 0 
                        ? `${platformTrialDaysRemaining} ${platformTrialDaysRemaining === 1 ? 'day' : 'days'} remaining in your platform trial`
                        : 'Your platform trial has ended'
                      }
                    </p>
                    <p className="text-white/60 text-sm">
                      {platformTrialDaysRemaining > 0 
                        ? 'You have full platform access during your trial. Complete payment setup below to secure your subscription. You\'ll get an additional 14 days before your first charge.'
                        : 'Subscribe now to continue using all platform features.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {showStripeTrialInfo && (
            <Card className="mb-6 border-jade-500/30 bg-gradient-to-r from-jade-500/10 to-jade-600/10" data-testid="card-stripe-trial-banner">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-jade-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">
                      Payment setup complete! {stripeTrialDaysRemaining > 0 && `${stripeTrialDaysRemaining} ${stripeTrialDaysRemaining === 1 ? 'day' : 'days'} until first charge`}
                    </p>
                    <p className="text-white/60 text-sm">
                      You're in your 14-day trial period. Your first payment of $50 will be charged when the trial ends. You now have access to placement credits and all premium features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {showTrialExpiredInfo && (
            <Card className="mb-6 border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10" data-testid="card-trial-expired-banner">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">
                      Your trial has ended
                    </p>
                    <p className="text-white/60 text-sm">
                      Subscribe now to restore full access to your community and unlock all platform features. Your community will be hidden from public discovery until you subscribe.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="premium-surface-elevated">
            <CardHeader className="text-center border-b border-white/10 pb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-copper-500/20 mb-4 mx-auto">
                <Sparkles className="w-8 h-8 text-copper-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Jugnu Community Subscription
              </CardTitle>
              <CardDescription className="text-lg text-white/70">
                Subscribe to {community.name}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">$50</span>
                  <span className="text-xl text-white/60">CAD / month</span>
                </div>
                <Badge variant="outline" className="border-jade-500/50 text-jade-400">
                  No commission on ticket sales - Keep 100% of revenue
                </Badge>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-white text-lg mb-4">What's Included:</h3>
                
                <div className="grid gap-3">
                  {[
                    'Full platform access (Communities, Events, Ticketing)',
                    '2 monthly ad placement credits ($1,250 value)',
                    'Unlimited ticket sales with ZERO commission',
                    'Advanced analytics & reporting',
                    'QR code check-in system',
                    'Email notifications via SendGrid',
                    'Priority support',
                    'All future features & updates',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-jade-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 mb-8">
                <h4 className="font-semibold text-white mb-3">Why Jugnu?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Competitors charge:</span>
                    <span className="text-red-400 font-semibold">5-10% per ticket</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Jugnu charges:</span>
                    <span className="text-jade-400 font-semibold">$50/month flat fee</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white/70">You keep:</span>
                    <span className="text-jade-400 font-bold text-lg">100% of ticket revenue</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowPaymentForm(true)}
                className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold text-lg py-6"
                data-testid="button-subscribe"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Subscribe for $50/month
              </Button>

              <p className="text-center text-sm text-white/50 mt-4">
                Secure payment powered by Stripe. Cancel anytime.
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6 premium-surface">
            <CardHeader>
              <CardTitle className="text-white">Common Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">How does the trial work?</h4>
                <p className="text-white/70 text-sm">
                  You get a 14-day platform trial when you create your community. When you complete payment setup, you get an additional 14-day trial before your first $50 charge. During both trials, you have full platform access.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">What happens after I subscribe?</h4>
                <p className="text-white/70 text-sm">
                  You'll have immediate access to all platform features including ticketing, communities, and 2 monthly placement credits. Your first payment is charged after the 14-day Stripe trial.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Can I cancel anytime?</h4>
                <p className="text-white/70 text-sm">
                  Yes! You can cancel your subscription at any time from your community settings. You'll retain full access until the end of your current billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">What are placement credits?</h4>
                <p className="text-white/70 text-sm">
                  Credits let you feature your events on the homepage or events page. Each credit = 1 day of placement (normally $625/day). You get 2 credits per month ($1,250 value).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
