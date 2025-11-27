import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, CreditCard, ArrowLeft, Loader2, AlertCircle, Building, Star, Percent } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OrganizerPaymentFormWrapper } from '@/components/billing/CustomPaymentForm';

interface OrganizerSubscription {
  id: string;
  status: string;
  plan: string;
  trialStart: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  credits: {
    available: number;
    used: number;
    total: number;
    resetDate: string | null;
  };
}

interface Community {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function OrganizerSubscribePage() {
  const [, navigate] = useLocation();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: subscriptionData, isLoading: isLoadingSubscription, refetch: refetchSubscription } = useQuery<{ 
    ok: boolean; 
    subscription: OrganizerSubscription | null;
    communities: Community[];
  }>({
    queryKey: ['/api/billing/organizer/subscription'],
  });

  const subscription = subscriptionData?.subscription;
  const communities = subscriptionData?.communities || [];

  useEffect(() => {
    if (subscription?.status === 'active') {
      toast({
        title: 'Already Subscribed',
        description: 'You already have an active subscription.',
      });
      navigate('/account/billing');
    }
  }, [subscription, navigate]);

  const handlePaymentSuccess = () => {
    refetchSubscription();
    toast({
      title: 'Subscription Activated!',
      description: 'Your Jugnu subscription is now active.',
    });
    navigate('/account/billing');
  };

  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = subscription?.trialEnd 
    ? Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const trialExpired = subscription?.status === 'trialing' && trialDaysRemaining <= 0;

  if (isLoadingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
          <p className="text-white/60">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (showPaymentForm) {
    return (
      <>
        <Helmet>
          <title>Complete Payment | Jugnu</title>
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

            <OrganizerPaymentFormWrapper
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
        <title>Subscribe to Jugnu | Business Platform</title>
        <meta 
          name="description" 
          content="Subscribe to Jugnu for $50/month. Get full platform access for all your communities, 2 monthly placement credits, and zero commission on ticket sales." 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-bg via-bg-secondary to-bg py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/account/billing')}
            className="mb-6 text-white/70 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Billing
          </Button>

          {isTrialing && trialDaysRemaining > 0 && (
            <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10" data-testid="card-trial-banner">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">
                      {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your trial
                    </p>
                    <p className="text-white/60 text-sm">
                      Add a payment method to continue after your trial ends
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {trialExpired && (
            <Card className="mb-6 border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10" data-testid="card-expired-banner">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Your trial has expired</p>
                    <p className="text-white/60 text-sm">
                      Subscribe now to regain full access to all platform features
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 bg-copper-500/20 text-copper-400 border-copper-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Business Platform
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Jugnu Business Subscription
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              One subscription for all your communities. Unlimited potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="premium-surface-elevated border-copper-500/30 relative overflow-hidden" data-testid="card-subscription-plan">
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-copper-500/20 to-transparent w-32 h-32" />
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-white">Business Plan</CardTitle>
                    <CardDescription className="text-white/60">
                      Everything you need to grow your events
                    </CardDescription>
                  </div>
                  <Badge className="bg-jade-500/20 text-jade-400 border-jade-500/30">
                    Popular
                  </Badge>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">$50</span>
                  <span className="text-white/60 text-lg">/month CAD</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-jade-400 flex-shrink-0" />
                    <span className="text-white">Full platform access for all communities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-copper-400 flex-shrink-0" />
                    <span className="text-white">
                      Covers your first community
                      <span className="text-white/50 text-sm ml-1">(+$25/mo for additional)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-copper-400 flex-shrink-0" />
                    <span className="text-white">2 placement credits per month</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-jade-400 flex-shrink-0" />
                    <span className="text-white font-semibold">0% commission on ticket sales</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-copper-400 flex-shrink-0" />
                    <span className="text-white">Direct payments via Stripe Connect</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => setShowPaymentForm(true)}
                    className="w-full bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-white font-semibold py-6 text-lg"
                    data-testid="button-subscribe"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    {subscription ? 'Add Payment Method' : 'Start 14-Day Free Trial'}
                  </Button>
                  {!subscription && (
                    <p className="text-center text-white/50 text-sm mt-3">
                      No credit card required to start your trial
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {communities.length > 0 && (
                <Card className="premium-surface border-white/10" data-testid="card-communities">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-copper-400" />
                      Your Communities
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      These communities will be covered by your subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {communities.map((community, index) => (
                        <div 
                          key={community.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div>
                            <p className="text-white font-medium">{community.name}</p>
                            <p className="text-white/50 text-sm">/{community.slug}</p>
                          </div>
                          {index === 0 ? (
                            <Badge className="bg-jade-500/20 text-jade-400 border-jade-500/30">
                              Included
                            </Badge>
                          ) : (
                            <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30">
                              +$25/mo
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    {communities.length > 1 && (
                      <p className="text-white/50 text-sm mt-4">
                        Total: $50 + ${(communities.length - 1) * 25} = ${50 + (communities.length - 1) * 25}/month
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="premium-surface border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Why Zero Commission?</CardTitle>
                </CardHeader>
                <CardContent className="text-white/60 space-y-3">
                  <p>
                    Unlike other platforms that take 5-10% of every ticket sale, Jugnu charges a flat monthly fee. 
                    This means you keep 100% of your ticket revenue.
                  </p>
                  <div className="bg-jade-500/10 border border-jade-500/30 rounded-lg p-4 mt-4">
                    <p className="text-jade-300 font-semibold mb-1">Example Savings</p>
                    <p className="text-jade-400/80 text-sm">
                      For a $10,000/month event, competitors charge $500-$1,000 in fees. 
                      With Jugnu, you pay just $50 flat.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
