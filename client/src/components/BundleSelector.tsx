import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Users } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

interface BundleSelectorProps {
  communityId?: string;
  organizerId?: string;
  existingBundle?: any;
  existingSubscription?: any;
  onSubscriptionCreated?: () => void;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export function BundleSelector({ 
  communityId, 
  organizerId, 
  existingBundle, 
  existingSubscription,
  onSubscriptionCreated 
}: BundleSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<'individual' | 'bundle' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCheckoutMutation = useMutation({
    mutationFn: async (params: { type: 'individual' | 'bundle'; communityId?: string; organizerId?: string }) => {
      return apiRequest('/api/billing/create-checkout', 'POST', params);
    },
    onSuccess: async (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        const stripe = await stripePromise;
        if (!stripe) {
          toast({
            title: 'Error',
            description: 'Failed to load payment processor',
            variant: 'destructive'
          });
          return;
        }

        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });

        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive'
          });
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  });

  const handleSelectPlan = async (type: 'individual' | 'bundle') => {
    setIsLoading(true);
    setSelectedPlan(type);

    if (type === 'individual' && communityId) {
      createCheckoutMutation.mutate({ type: 'individual', communityId });
    } else if (type === 'bundle' && organizerId) {
      createCheckoutMutation.mutate({ type: 'bundle', organizerId });
    } else {
      toast({
        title: 'Error',
        description: 'Missing required information',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  // If already has a subscription or bundle, show current plan
  if (existingSubscription || existingBundle) {
    const isBundle = !!existingBundle;
    const plan = isBundle ? existingBundle : existingSubscription;
    
    return (
      <Card className="w-full max-w-2xl mx-auto" data-testid="card-current-plan">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${plan.status}`}>
              {plan.status}
            </Badge>
          </div>
          <CardDescription>
            {isBundle ? 'Community Bundle (5 communities)' : 'Individual Community Subscription'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium" data-testid="text-price">
                ${isBundle ? '75' : '20'} CAD/month
              </span>
            </div>
            {isBundle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Communities Used</span>
                <span className="font-medium" data-testid="text-communities-used">
                  {plan.communitiesUsed} / {plan.communitiesIncluded}
                </span>
              </div>
            )}
            {plan.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Billing Date</span>
                <span className="font-medium" data-testid="text-next-billing">
                  {new Date(plan.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show pricing selection
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Select the best option for your community management needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Individual Plan */}
        <Card 
          className={`relative cursor-pointer transition-all hover:shadow-lg ${
            selectedPlan === 'individual' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => !isLoading && handleSelectPlan('individual')}
          data-testid="card-individual-plan"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Community
            </CardTitle>
            <CardDescription>Perfect for single community management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              $20 <span className="text-lg font-normal text-muted-foreground">CAD/month</span>
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Up to 500 members</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Unlimited posts & events</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Real-time chat</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Analytics dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>14-day free trial</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              disabled={isLoading && selectedPlan === 'individual'}
              data-testid="button-select-individual"
            >
              {isLoading && selectedPlan === 'individual' ? 'Processing...' : 'Select Individual Plan'}
            </Button>
          </CardFooter>
        </Card>

        {/* Bundle Plan */}
        <Card 
          className={`relative cursor-pointer transition-all hover:shadow-lg ${
            selectedPlan === 'bundle' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => !isLoading && handleSelectPlan('bundle')}
          data-testid="card-bundle-plan"
        >
          <div className="absolute -top-3 right-4">
            <Badge className="flex items-center gap-1" variant="default">
              <Sparkles className="h-3 w-3" />
              SAVE 25%
            </Badge>
          </div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Bundle
            </CardTitle>
            <CardDescription>Manage multiple communities with one subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              $75 <span className="text-lg font-normal text-muted-foreground">CAD/month</span>
            </div>
            <div className="text-sm text-muted-foreground">
              For 5 communities ($15 per community)
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">All Individual features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>5 community slots</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Custom domain support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Email blast campaigns</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>14-day free trial</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="default"
              disabled={isLoading && selectedPlan === 'bundle'}
              data-testid="button-select-bundle"
            >
              {isLoading && selectedPlan === 'bundle' ? 'Processing...' : 'Select Bundle Plan'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day free trial. Cancel anytime.</p>
        <p>Prices are in Canadian dollars and billed monthly.</p>
      </div>
    </div>
  );
}