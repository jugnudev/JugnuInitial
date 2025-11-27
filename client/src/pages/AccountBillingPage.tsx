import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  CheckCircle,
  Shield,
  Loader2,
  Building2,
  Star,
  Percent
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Organizer {
  id: string;
  businessName: string;
  email: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface OrganizerSubscription {
  id: string;
  status: string;
  computedState: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  credits: {
    available: number;
    used: number;
    total: number;
    resetDate: string | null;
  };
}

export default function AccountBillingPage() {
  const [, navigate] = useLocation();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Fetch current user
  const { data: authData, isLoading: authLoading } = useQuery<{ 
    ok: boolean; 
    user: { id: string } | null;
  }>({ queryKey: ['/api/auth/me'] });

  // Fetch organizer profile
  const { data: organizerData, isLoading: organizerLoading } = useQuery<{ 
    ok: boolean; 
    organizer: Organizer | null;
  }>({ 
    queryKey: ['/api/organizers/me'],
    enabled: !!authData?.user 
  });

  // Fetch organizer subscription (new endpoint)
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<{ 
    ok: boolean; 
    subscription: OrganizerSubscription | null;
    communities: Community[];
    hasLegacySubscription?: boolean;
  }>({ 
    queryKey: ['/api/billing/organizer/subscription'],
    enabled: !!organizerData?.organizer 
  });

  const organizer = organizerData?.organizer;
  const subscription = subscriptionData?.subscription;
  const communities = subscriptionData?.communities || [];
  const hasLegacySubscription = subscriptionData?.hasLegacySubscription;

  const isLoading = authLoading || organizerLoading || subscriptionLoading;

  // Subscription status helpers
  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = subscription?.trialEnd 
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialExpired = subscription?.computedState === 'ended';
  const hasStripeCustomer = !!subscription?.stripeCustomerId;
  const canAccessPortal = isActive && hasStripeCustomer;

  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const authToken = localStorage.getItem('community_auth_token');
      if (!authToken) {
        throw new Error('Please log in to access billing portal');
      }

      const response = await fetch('/api/billing/organizer/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ returnUrl: window.location.href }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const data = await response.json();

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: 'Portal Access Failed',
        description: error.message || 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
          <p className="text-white/60">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!authData?.user) {
    navigate('/account/signin');
    return null;
  }

  if (!organizer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full premium-surface-elevated">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-12 h-12 text-copper-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Business Account</h2>
            <p className="text-white/60 mb-6">Create a business account to access billing features.</p>
            <Link href="/business/signup">
              <Button className="bg-copper-500 hover:bg-copper-600 text-black font-semibold">
                Create Business Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No subscription exists yet
  if (!subscription) {
    return (
      <>
        <Helmet>
          <title>Billing & Subscription - Jugnu</title>
          <meta name="description" content="Subscribe to Jugnu to access all platform features for your communities." />
        </Helmet>

        <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Billing & Subscription</h1>
              <p className="text-white/60">
                Subscribe to unlock all platform features for your communities
              </p>
            </div>

            {hasLegacySubscription && (
              <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Existing Community Subscription Detected</p>
                      <p className="text-white/60 text-sm">
                        Your subscription will be automatically migrated to the new organizer-level system.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="premium-surface-elevated border-copper-500/30 mb-6" data-testid="card-no-subscription">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Jugnu Business Plan</CardTitle>
                <CardDescription className="text-white/60">
                  One subscription for all your communities
                </CardDescription>
              </CardHeader>

              <Separator className="bg-white/10" />

              <CardContent className="pt-6">
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">$50</span>
                  <span className="text-white/60 text-lg">/month CAD</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-jade-400 flex-shrink-0" />
                    <span className="text-white">Full platform access for all communities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-copper-400 flex-shrink-0" />
                    <span className="text-white">
                      First community included
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
                </div>

                <Link href="/account/subscribe">
                  <Button 
                    className="w-full bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-white font-semibold py-6 text-lg"
                    data-testid="button-subscribe"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start 14-Day Free Trial
                  </Button>
                </Link>
                <p className="text-center text-white/50 text-sm mt-3">
                  No credit card required to start your trial
                </p>
              </CardContent>
            </Card>

            {communities.length > 0 && (
              <Card className="premium-surface">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-copper-400" />
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
                        <Badge 
                          className={community.status === 'active' 
                            ? 'bg-jade-500/20 text-jade-400 border-jade-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }
                        >
                          {community.status === 'active' ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </>
    );
  }

  // Active subscription exists
  return (
    <>
      <Helmet>
        <title>Billing & Subscription - Jugnu</title>
        <meta name="description" content="Manage your Jugnu subscription, payment methods, and billing information." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-white/60">
              Manage your subscription and view billing information
            </p>
          </div>

          {/* Trial Banner */}
          {isTrialing && trialDaysRemaining > 0 && (
            <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10" data-testid="card-trial-banner">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <Link href="/account/subscribe">
                    <Button className="bg-copper-500 hover:bg-copper-600 text-black font-semibold whitespace-nowrap">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Add Payment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expired Trial Banner */}
          {trialExpired && (
            <Card className="mb-6 border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10" data-testid="card-expired-banner">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Your trial has expired</p>
                      <p className="text-white/60 text-sm">
                        Subscribe now to regain full access to all platform features
                      </p>
                    </div>
                  </div>
                  <Link href="/account/subscribe">
                    <Button className="bg-copper-500 hover:bg-copper-600 text-black font-semibold whitespace-nowrap">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Card */}
          <Card className="premium-surface-elevated mb-6" data-testid="card-subscription">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    Jugnu Business Plan
                  </CardTitle>
                  <CardDescription className="text-white/60 mt-1">
                    Covers all your communities
                  </CardDescription>
                </div>
                <Badge 
                  variant={isActive ? 'default' : isTrialing ? 'secondary' : 'outline'}
                  className={
                    isActive 
                      ? 'bg-jade-500/20 text-jade-400 border-jade-500/30' 
                      : isTrialing 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }
                  data-testid="badge-subscription-status"
                >
                  {isActive ? '✅ Active' : isTrialing ? '🎉 Trial' : '⚠️ Inactive'}
                </Badge>
              </div>
            </CardHeader>
            
            <Separator className="bg-white/10" />

            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Plan Details */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Plan Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Base Price:</span>
                      <span className="text-white font-semibold">$50/month CAD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Commission:</span>
                      <span className="text-jade-400 font-semibold">0%</span>
                    </div>
                  </div>
                </div>

                {/* Billing Status */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Billing Status</h3>
                  <div className="space-y-3">
                    {isActive && subscription.currentPeriodEnd && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-white/70 mt-0.5" />
                        <div>
                          <p className="text-white/70 text-sm">Next billing:</p>
                          <p className="text-white font-medium">
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {isTrialing && subscription.trialEnd && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-white/70 text-sm">Trial ends:</p>
                          <p className="text-white font-medium">
                            {new Date(subscription.trialEnd).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Credits */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Placement Credits</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-copper-400 mt-0.5" />
                      <div>
                        <p className="text-white/70 text-sm">Available:</p>
                        <p className="text-white font-medium">
                          {subscription.credits.available} of {subscription.credits.total} credits
                        </p>
                      </div>
                    </div>
                    {subscription.credits.resetDate && (
                      <p className="text-white/50 text-xs">
                        Resets {new Date(subscription.credits.resetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                {canAccessPortal && (
                  <Button
                    onClick={handleOpenBillingPortal}
                    disabled={isOpeningPortal}
                    className="flex-1 bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                    data-testid="button-manage-billing"
                  >
                    {isOpeningPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening Portal...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Billing
                      </>
                    )}
                  </Button>
                )}

                {isTrialing && !hasStripeCustomer && (
                  <Link href="/account/subscribe" className="flex-1">
                    <Button 
                      className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                      data-testid="button-add-payment"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communities Card */}
          {communities.length > 0 && (
            <Card className="premium-surface mb-6" data-testid="card-communities">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-copper-400" />
                  Communities ({communities.length})
                </CardTitle>
                <CardDescription className="text-white/60">
                  All communities covered by your subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communities.map((community, index) => (
                    <div 
                      key={community.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-white font-medium">{community.name}</p>
                          <p className="text-white/50 text-sm">/{community.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {index === 0 ? (
                          <Badge className="bg-jade-500/20 text-jade-400 border-jade-500/30">
                            Included
                          </Badge>
                        ) : (
                          <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30">
                            +$25/mo
                          </Badge>
                        )}
                        <Link href={`/communities/${community.slug}/settings`}>
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                            Settings
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {communities.length > 1 && (
                  <p className="text-white/50 text-sm mt-4">
                    Total: $50 + ${(communities.length - 1) * 25} = ${50 + (communities.length - 1) * 25}/month CAD
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Features Included Card */}
          <Card className="premium-surface mb-6">
            <CardHeader>
              <CardTitle className="text-white">What's Included</CardTitle>
              <CardDescription className="text-white/60">
                Everything you get with your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'Full platform access',
                  'Unlimited ticket sales',
                  '2 monthly placement credits',
                  'Advanced analytics',
                  'QR code check-in',
                  'Email notifications',
                  'Priority support',
                  'All future updates',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-jade-400 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Business Info Card */}
          <Card className="premium-surface">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-copper-400" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-white/60">Business Name</p>
                  <p className="text-white font-medium">{organizer.businessName}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Email</p>
                  <p className="text-white font-medium">{organizer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Communities</p>
                  <p className="text-white font-medium">{communities.length} {communities.length === 1 ? 'community' : 'communities'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
