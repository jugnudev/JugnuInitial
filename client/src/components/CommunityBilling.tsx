import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Crown,
  Users,
  MessageSquare,
  BarChart3,
  Share2,
  Shield,
  Sparkles,
  Check,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BillingProps {
  communityId: string;
  communitySlug: string;
  isOwner: boolean;
}

interface Subscription {
  id: string;
  communityId: string;
  organizerId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAt?: string;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  trialDaysRemaining?: number;
  memberLimit: number;
  features?: any;
  metadata?: any;
  canManage: boolean;
  payments?: Payment[];
}

interface Payment {
  id: string;
  createdAt: string;
  amountPaid: number;
  currency: string;
  status: string;
  description?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  receiptUrl?: string;
  failureReason?: string;
}

const communityFeatures = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Member Management",
    description: "Add and manage community members with role-based permissions"
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Real-time Chat",
    description: "Engage members with instant messaging and group conversations"
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Event Planning",
    description: "Create and manage community events with calendar sync"
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Analytics Dashboard",
    description: "Track engagement, growth, and member activity"
  },
  {
    icon: <Share2 className="w-5 h-5" />,
    title: "Social Sharing",
    description: "Grow your community with invite links and social integration"
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy Controls",
    description: "Secure your community with customizable privacy settings"
  },
];

export default function CommunityBilling({
  communityId,
  communitySlug,
  isOwner,
}: BillingProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  const { data: subscription, isLoading, error } = useQuery<{ subscription: Subscription }>({
    queryKey: ['/api/communities', communityId, 'billing/status'],
    enabled: !!communityId,
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (priceId: 'monthly' | 'yearly') => {
      return apiRequest('POST', `/api/communities/${communityId}/billing/create-checkout`, {
        priceId,
      }) as Promise<{ checkoutUrl?: string }>;
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('No checkoutUrl in response:', data);
        toast({
          title: "Failed to redirect to checkout",
          description: "No checkout URL was returned. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Checkout mutation error:', error);
      toast({
        title: "Failed to create checkout session",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const createPortalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/communities/${communityId}/billing/manage`) as Promise<{ portalUrl?: string }>;
    },
    onSuccess: (data: any) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to access billing portal",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/communities/${communityId}/billing/cancel`);
    },
    onSuccess: () => {
      toast({
        title: "Subscription canceled",
        description: "Your subscription will remain active until the end of the billing period",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'billing/status'] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel subscription",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  if (!isOwner) {
    return (
      <Alert data-testid="alert-not-owner">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Only community owners can manage billing settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-error">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load billing information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const sub = subscription?.subscription;
  const isTrialing = sub?.status === 'trialing';
  const isActive = sub?.status === 'active';
  const isPastDue = sub?.status === 'past_due';
  const isCanceled = sub?.status === 'canceled';
  const trialDays = sub?.trialDaysRemaining || 0;
  const trialProgress = trialDays > 0 ? ((7 - trialDays) / 7) * 100 : 100;

  return (
    <div className="space-y-8">
      {isTrialing && trialDays > 0 && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white" data-testid="banner-trial">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Free Trial: {trialDays} days remaining</h3>
              </div>
              <p className="text-sm text-white/90">
                Upgrade now to continue using all features after your trial ends
              </p>
              <div className="mt-3">
                <Progress value={trialProgress} className="h-2 bg-white/20" data-testid="progress-trial" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isPastDue && (
        <Alert variant="destructive" data-testid="alert-past-due">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your payment is past due. Please update your payment method to continue using all features.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Community Features</h2>
          <p className="text-muted-foreground">
            Unlock powerful tools to grow and engage your community
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg border bg-card p-5 hover:shadow-lg transition-all duration-300"
              data-testid={`feature-${index}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 space-y-3">
                <div className="inline-flex p-2 rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Choose Your Plan</h2>
          <p className="text-muted-foreground">
            Select a plan that works for your community
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden" data-testid="card-monthly">
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <CardTitle>Monthly</CardTitle>
              </div>
              <CardDescription>Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$20</span>
                  <span className="text-muted-foreground">CAD/month</span>
                </div>
                <p className="text-sm text-muted-foreground">7-day free trial included</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>All community features</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Real-time chat</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Event management</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Priority support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => createCheckoutMutation.mutate('monthly')}
                disabled={createCheckoutMutation.isPending || (isActive && sub?.plan === 'monthly')}
                data-testid="button-upgrade-monthly"
              >
                {createCheckoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isActive && sub?.plan === 'monthly' ? (
                  'Current Plan'
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade to Monthly
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden border-2 border-purple-600" data-testid="card-yearly">
            <div className="absolute -top-1 -right-1">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg">
                Save $40
              </Badge>
            </div>
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-purple-600/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <CardTitle>Yearly</CardTitle>
              </div>
              <CardDescription>Best value for committed communities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$200</span>
                  <span className="text-muted-foreground">CAD/year</span>
                </div>
                <p className="text-sm text-green-600 font-medium">Save $40 compared to monthly</p>
                <p className="text-sm text-muted-foreground">7-day free trial included</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>All community features</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Real-time chat</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Event management</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">2 months free</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
                onClick={() => createCheckoutMutation.mutate('yearly')}
                disabled={createCheckoutMutation.isPending || (isActive && sub?.plan === 'yearly')}
                data-testid="button-upgrade-yearly"
              >
                {createCheckoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isActive && sub?.plan === 'yearly' ? (
                  'Current Plan'
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Yearly
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {(isActive || isCanceled) && (
        <Card data-testid="card-subscription-status">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Manage your community subscription</CardDescription>
              </div>
              <Badge 
                className={
                  isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }
                data-testid="badge-status"
              >
                {isActive && <CheckCircle className="w-3 h-3 mr-1" />}
                {isCanceled && <XCircle className="w-3 h-3 mr-1" />}
                {isActive ? 'Active' : 'Canceled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="font-medium capitalize" data-testid="text-plan">{sub?.plan}</p>
              </div>
              {sub?.currentPeriodEnd && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {isCanceled ? 'Ends On' : 'Next Billing Date'}
                  </p>
                  <p className="font-medium" data-testid="text-period-end">
                    {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium" data-testid="text-amount">
                  ${sub?.plan === 'yearly' ? '200' : '20'} CAD/{sub?.plan === 'yearly' ? 'year' : 'month'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => createPortalMutation.mutate()}
                disabled={createPortalMutation.isPending}
                data-testid="button-manage"
              >
                {createPortalMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Manage Billing
                  </>
                )}
              </Button>

              {isActive && !isCanceled && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  data-testid="button-cancel"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent data-testid="dialog-cancel">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access
              until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-no">No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-cancel-yes"
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
