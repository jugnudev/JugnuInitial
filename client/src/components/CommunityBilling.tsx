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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Download,
  Sparkles,
  AlertCircle,
  Loader2,
  Zap,
  Info,
  Crown,
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

const statusConfig = {
  trialing: {
    label: 'Free Trial',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: <Clock className="w-4 h-4" />,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  past_due: {
    label: 'Past Due',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  canceled: {
    label: 'Canceled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: <XCircle className="w-4 h-4" />,
  },
  paused: {
    label: 'Paused',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  expired: {
    label: 'Expired',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: <XCircle className="w-4 h-4" />,
  },
};

const planConfig = {
  free: {
    label: 'Free Trial',
    price: 0,
    period: 'trial',
    features: [
      'Up to 100 members',
      'Basic analytics',
      'Community chat',
      'Event calendar',
    ],
  },
  monthly: {
    label: 'Monthly',
    price: 19.99,
    period: 'month',
    features: [
      'Unlimited members',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'API access',
      'Export data',
    ],
  },
  yearly: {
    label: 'Yearly',
    price: 199,
    period: 'year',
    savings: 40,
    features: [
      'Everything in Monthly',
      'Save $40/year',
      'Annual reporting',
      'Dedicated support',
      'Early access to features',
    ],
  },
};

export default function CommunityBilling({
  communityId,
  communitySlug,
  isOwner,
}: BillingProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showManagePortal, setShowManagePortal] = useState(false);
  const { toast } = useToast();

  // Get subscription status
  const { data: subscription, isLoading, error } = useQuery<{ subscription: Subscription }>({
    queryKey: ['/api/communities', communityId, 'billing/status'],
    enabled: !!communityId,
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (priceId: 'monthly' | 'yearly') => {
      return apiRequest(`/api/communities/${communityId}/billing/create-checkout`, 'POST', {
        priceId,
      });
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create checkout session",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Create customer portal session mutation
  const createPortalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/communities/${communityId}/billing/manage`, 'POST');
    },
    onSuccess: (data) => {
      // Redirect to Stripe customer portal
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

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/communities/${communityId}/billing/cancel`, 'POST');
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

  // Resume subscription mutation
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/communities/${communityId}/billing/resume`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Subscription resumed",
        description: "Your subscription has been reactivated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'billing/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resume subscription",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load billing information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const sub = subscription?.subscription;
  if (!sub) return null;

  const status = statusConfig[sub.status] || statusConfig.expired;
  const plan = planConfig[sub.plan] || planConfig.free;
  const isTrialing = sub.status === 'trialing';
  const isCanceled = sub.status === 'canceled';
  const canUpgrade = isTrialing || sub.plan === 'free';
  const hasActiveSubscription = sub.status === 'active' && sub.stripeSubscriptionId;

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && sub.trialDaysRemaining !== undefined && (
        <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong className="text-blue-900 dark:text-blue-100">
                Free trial: {sub.trialDaysRemaining} days remaining
              </strong>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Upgrade now to continue using all features after your trial ends
              </p>
            </div>
            {sub.trialDaysRemaining <= 3 && (
              <Badge variant="destructive" className="ml-4">
                Expires Soon
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Subscription Status
            </CardTitle>
            <Badge className={status.color}>
              <span className="flex items-center gap-1">
                {status.icon}
                {status.label}
              </span>
            </Badge>
          </div>
          <CardDescription>
            Manage your community subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-2xl font-bold">{plan.label}</p>
              {!isTrialing && (
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ${plan.price} CAD/{plan.period}
                </p>
              )}
            </div>
            {hasActiveSubscription && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next billing date</p>
                <p className="font-medium">
                  {sub.currentPeriodEnd
                    ? format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')
                    : 'N/A'}
                </p>
              </div>
            )}
          </div>

          {/* Trial Progress */}
          {isTrialing && sub.trialEnd && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Trial Progress</span>
                <span>{14 - (sub.trialDaysRemaining || 0)} of 14 days</span>
              </div>
              <Progress 
                value={((14 - (sub.trialDaysRemaining || 0)) / 14) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Cancellation Notice */}
          {sub.cancelAt && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                Your subscription will be canceled on{' '}
                <strong>{format(new Date(sub.cancelAt), 'MMM d, yyyy')}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        {isOwner && sub.canManage && (
          <CardFooter className="flex flex-wrap gap-2">
            {canUpgrade ? (
              <>
                <Button
                  onClick={() => createCheckoutMutation.mutate('monthly')}
                  disabled={createCheckoutMutation.isPending}
                  className="flex-1"
                  data-testid="button-upgrade-monthly"
                >
                  {createCheckoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Upgrade to Monthly
                </Button>
                <Button
                  onClick={() => createCheckoutMutation.mutate('yearly')}
                  disabled={createCheckoutMutation.isPending}
                  variant="default"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  data-testid="button-upgrade-yearly"
                >
                  {createCheckoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Upgrade to Yearly (Save $40)
                </Button>
              </>
            ) : hasActiveSubscription ? (
              <>
                <Button
                  onClick={() => createPortalMutation.mutate()}
                  disabled={createPortalMutation.isPending}
                  variant="outline"
                  data-testid="button-manage-billing"
                >
                  {createPortalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
                {sub.cancelAt ? (
                  <Button
                    onClick={() => resumeSubscriptionMutation.mutate()}
                    disabled={resumeSubscriptionMutation.isPending}
                    variant="default"
                    data-testid="button-resume-subscription"
                  >
                    {resumeSubscriptionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Resume Subscription
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="destructive"
                    data-testid="button-cancel-subscription"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
              </>
            ) : null}
          </CardFooter>
        )}
      </Card>

      {/* Payment History */}
      {sub.payments && sub.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              View your recent payments and download receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sub.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.description || 'Community Membership'}
                    </TableCell>
                    <TableCell>
                      ${(payment.amountPaid / 100).toFixed(2)} {payment.currency}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === 'succeeded' ? 'default' : 'destructive'}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.receiptUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          data-testid={`button-receipt-${payment.id}`}
                        >
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Receipt
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              You can resume your subscription at any time before it expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscriptionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}