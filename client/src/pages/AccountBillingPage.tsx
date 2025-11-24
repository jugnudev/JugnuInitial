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
  Building2
} from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { TrialBanner } from '@/components/billing/TrialBanner';
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
  organizerId: string;
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

  // Fetch communities
  const { data: communitiesData, isLoading: communitiesLoading } = useQuery<{ 
    ok: boolean; 
    communities: Community[];
  }>({ 
    queryKey: ['/api/communities'],
    enabled: !!organizerData?.organizer 
  });

  const organizer = organizerData?.organizer;
  const communities = communitiesData?.communities || [];
  const firstCommunity = communities[0];

  // Fetch subscription status for first community
  const {
    subscription,
    isTrialing,
    isActive,
    isInactive,
    trialDaysRemaining,
    availableCredits,
    canManage,
    isLoading: subscriptionLoading
  } = useSubscriptionStatus(firstCommunity?.id);

  const isLoading = authLoading || organizerLoading || communitiesLoading || subscriptionLoading;

  const handleOpenBillingPortal = async () => {
    if (!firstCommunity?.id) return;

    setIsOpeningPortal(true);
    try {
      const authToken = localStorage.getItem('community_auth_token');
      if (!authToken) {
        throw new Error('Please log in to access billing portal');
      }

      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          communityId: firstCommunity.id,
          returnUrl: window.location.href 
        }),
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
    navigate('/auth');
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

  if (communities.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full premium-surface-elevated">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Communities Found</h2>
            <p className="text-white/60 mb-6">Create a community to manage your subscription.</p>
            <Link href="/communities/signup">
              <Button className="bg-copper-500 hover:bg-copper-600 text-black font-semibold">
                Create Community
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasStripeCustomer = !!subscription?.stripeCustomerId;
  const canAccessPortal = isActive && hasStripeCustomer && canManage;

  return (
    <>
      <Helmet>
        <title>Billing & Subscription - Jugnu</title>
        <meta name="description" content="Manage your Jugnu subscription, payment methods, and billing information." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-white/60">Manage your subscription and payment information</p>
          </div>

          {/* Trial Banner */}
          {isTrialing && trialDaysRemaining !== null && firstCommunity && (
            <TrialBanner 
              daysRemaining={trialDaysRemaining} 
              communityId={firstCommunity.id}
              className="mb-6"
            />
          )}

          {/* Subscription Overview Card */}
          <Card className="premium-surface-elevated mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-copper-400" />
                    Subscription Status
                  </CardTitle>
                  <CardDescription className="text-white/60 mt-1">
                    {firstCommunity.name}
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
              <div className="grid md:grid-cols-2 gap-6">
                {/* Plan Details */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Plan Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Price:</span>
                      <span className="text-white font-semibold">$50/month CAD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Commission:</span>
                      <span className="text-jade-400 font-semibold">0%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Monthly Credits:</span>
                      <span className="text-white font-semibold">2 placements</span>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Current Status</h3>
                  <div className="space-y-3">
                    {isActive && subscription?.currentPeriodEnd && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-white/70 mt-0.5" />
                        <div>
                          <p className="text-white/70 text-sm">Next billing date:</p>
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
                    {isTrialing && subscription?.trialEndsAt && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-white/70 text-sm">Trial ends:</p>
                          <p className="text-white font-medium">
                            {new Date(subscription.trialEndsAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-copper-400 mt-0.5" />
                      <div>
                        <p className="text-white/70 text-sm">Available credits:</p>
                        <p className="text-white font-medium">{availableCredits} placement{availableCredits !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <Separator className="bg-white/10 my-6" />

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

                {isActive && !hasStripeCustomer && firstCommunity && (
                  <Link href={`/subscribe/${firstCommunity.id}`} className="flex-1">
                    <Button 
                      className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                      data-testid="button-complete-payment"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Complete Payment Setup
                    </Button>
                  </Link>
                )}

                {isTrialing && firstCommunity && (
                  <Link href={`/subscribe/${firstCommunity.id}`} className="flex-1">
                    <Button 
                      className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                      data-testid="button-upgrade-subscription"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to Paid
                    </Button>
                  </Link>
                )}

                {!isActive && !isTrialing && firstCommunity && (
                  <Link href={`/subscribe/${firstCommunity.id}`} className="flex-1">
                    <Button 
                      className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                      data-testid="button-subscribe"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </Button>
                  </Link>
                )}

                <Link href="/pricing" className="flex-1">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                    View Pricing Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Features Included Card */}
          <Card className="premium-surface">
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
          <Card className="mt-6 premium-surface">
            <CardHeader>
              <CardTitle className="text-white">Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
