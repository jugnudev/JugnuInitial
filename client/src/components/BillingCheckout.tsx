import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Check,
  CreditCard,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Info,
  Loader2,
  Crown,
  Gift,
  Star,
  Users,
  BarChart3,
  MessageSquare,
  Calendar,
  Download,
  Lock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BillingCheckoutProps {
  communityId: string;
  communityName: string;
  isUpgrade?: boolean;
  currentPlan?: 'free' | 'monthly' | 'yearly';
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PricingPlan {
  id: 'monthly' | 'yearly';
  name: string;
  price: number;
  period: string;
  description: string;
  priceId?: string;
  savings?: number;
  popular?: boolean;
  features: {
    text: string;
    included: boolean;
    highlight?: boolean;
  }[];
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 19.99,
    period: 'month',
    description: 'Perfect for growing communities',
    priceId: 'price_monthly_1999',
    features: [
      { text: 'Unlimited members', included: true, highlight: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Custom community branding', included: true },
      { text: 'API access for integrations', included: true },
      { text: 'Export member data', included: true },
      { text: 'Remove Jugnu branding', included: true },
      { text: 'Advanced moderation tools', included: true },
      { text: 'Cancel anytime', included: true },
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    price: 199,
    period: 'year',
    description: 'Best value for committed organizers',
    priceId: 'price_yearly_19900',
    savings: 40,
    popular: true,
    features: [
      { text: 'Everything in Monthly plan', included: true, highlight: true },
      { text: 'Save $40 per year', included: true, highlight: true },
      { text: 'Annual community reports', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Custom feature requests', included: true },
      { text: 'Phone support', included: true },
      { text: 'Data backup & recovery', included: true },
      { text: 'Priority feature development', included: true },
    ],
  },
];

export default function BillingCheckout({
  communityId,
  communityName,
  isUpgrade = false,
  currentPlan = 'free',
  onSuccess,
  onCancel,
}: BillingCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast } = useToast();

  const createCheckoutMutation = useMutation({
    mutationFn: async (priceId: 'monthly' | 'yearly') => {
      return apiRequest(`/api/communities/${communityId}/billing/create-checkout`, 'POST', {
        priceId,
        successUrl: `${window.location.origin}/community/${communityId}/billing?success=true`,
        cancelUrl: `${window.location.origin}/community/${communityId}/billing?canceled=true`,
      }) as unknown as { checkoutUrl: string };
    },
    onSuccess: (data) => {
      setIsRedirecting(true);
      if (data.checkoutUrl) {
        // Show redirect message
        toast({
          title: "Redirecting to checkout...",
          description: "You'll be redirected to Stripe to complete your purchase",
        });
        // Redirect to Stripe checkout
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1000);
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create checkout",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    createCheckoutMutation.mutate(selectedPlan);
  };

  const selectedPlanData = pricingPlans.find(p => p.id === selectedPlan);
  const isLoading = createCheckoutMutation.isPending || isRedirecting;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {isUpgrade ? 'Upgrade Your Community' : 'Choose Your Plan'}
        </h2>
        <p className="text-lg text-muted-foreground">
          Unlock the full potential of {communityName}
        </p>
        {!isUpgrade && (
          <Badge variant="secondary" className="mt-2">
            <Gift className="w-3 h-3 mr-1" />
            14-day free trial included
          </Badge>
        )}
      </div>

      {/* Trust Indicators */}
      <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Secure payments via Stripe</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-4 h-4 text-green-600" />
          <span>SSL encrypted</span>
        </div>
        <div className="flex items-center gap-1">
          <CreditCard className="w-4 h-4 text-green-600" />
          <span>No setup fees</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200",
              selectedPlan === plan.id 
                ? "ring-2 ring-indigo-600 shadow-xl scale-[1.02]" 
                : "hover:shadow-lg",
              plan.popular && "border-indigo-600"
            )}
            onClick={() => setSelectedPlan(plan.id)}
            data-testid={`card-plan-${plan.id}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  MOST POPULAR
                </Badge>
              </div>
            )}
            {plan.savings && (
              <div className="absolute -top-3 right-4 z-10">
                <Badge variant="default" className="bg-green-600">
                  Save ${plan.savings}
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-1">{plan.description}</CardDescription>
                </div>
                <RadioGroupItem
                  value={plan.id}
                  checked={selectedPlan === plan.id}
                  className="mt-1"
                  data-testid={`radio-plan-${plan.id}`}
                />
              </div>
              <div className="mt-4">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="ml-2 text-muted-foreground">CAD/{plan.period}</span>
                </div>
                {plan.id === 'yearly' && (
                  <p className="text-sm text-green-600 mt-1">
                    Only ${(plan.price / 12).toFixed(2)}/month when billed annually
                  </p>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-start gap-2",
                      feature.highlight && "font-medium"
                    )}
                  >
                    <Check className={cn(
                      "w-5 h-5 mt-0.5 flex-shrink-0",
                      feature.highlight ? "text-green-600" : "text-green-500"
                    )} />
                    <span className="text-sm">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Plan Summary */}
      {selectedPlanData && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Selected Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Plan</span>
              <span className="font-semibold">{selectedPlanData.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Price</span>
              <span className="font-semibold">
                ${selectedPlanData.price} CAD/{selectedPlanData.period}
              </span>
            </div>
            {selectedPlanData.savings && (
              <div className="flex justify-between items-center text-green-600">
                <span>Annual Savings</span>
                <span className="font-semibold">${selectedPlanData.savings}</span>
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Due Today</span>
              <span>${isUpgrade ? selectedPlanData.price : 0} CAD</span>
            </div>
            {!isUpgrade && (
              <p className="text-sm text-muted-foreground">
                Your card will be charged after the 14-day free trial ends
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checkout Button */}
      <div className="flex flex-col items-center space-y-4">
        <Button
          size="lg"
          onClick={handleCheckout}
          disabled={isLoading}
          className="min-w-[200px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          data-testid="button-proceed-checkout"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to checkout...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Secure Checkout
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-checkout"
          >
            Maybe later
          </Button>
        )}
      </div>

      {/* Security & Guarantee */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold">100% Secure</h3>
            <p className="text-sm text-muted-foreground">
              Your payment info is encrypted and secure
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <Zap className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="font-semibold">Instant Access</h3>
            <p className="text-sm text-muted-foreground">
              Get immediate access to all features
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold">Cancel Anytime</h3>
            <p className="text-sm text-muted-foreground">
              No questions asked, no hidden fees
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Questions?</strong> Contact our support team at support@jugnu.app or check our{' '}
          <a href="/help/billing" className="underline">
            billing FAQ
          </a>
          .
        </AlertDescription>
      </Alert>
    </div>
  );
}