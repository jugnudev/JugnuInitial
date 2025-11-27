import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions, Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const stripeAppearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#c0580f',
    colorBackground: '#1a1a1a',
    colorText: '#ffffff',
    colorTextSecondary: '#a0a0a0',
    colorDanger: '#ef4444',
    colorSuccess: '#22c55e',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '8px',
    spacingUnit: '4px',
    focusBoxShadow: '0 0 0 2px rgba(192, 88, 15, 0.3)',
    focusOutline: '2px solid #c0580f',
  },
  rules: {
    '.Input': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid #c0580f',
      boxShadow: '0 0 0 3px rgba(192, 88, 15, 0.15)',
    },
    '.Input:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.07)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
    },
    '.Input--invalid': {
      border: '1px solid #ef4444',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
    },
    '.Label': {
      color: '#ffffff',
      fontWeight: '500',
      marginBottom: '8px',
    },
    '.Tab': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#a0a0a0',
    },
    '.Tab:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      color: '#ffffff',
    },
    '.Tab--selected': {
      backgroundColor: 'rgba(192, 88, 15, 0.15)',
      border: '1px solid #c0580f',
      color: '#ffffff',
    },
    '.TabIcon': {
      fill: '#a0a0a0',
    },
    '.TabIcon--selected': {
      fill: '#c0580f',
    },
    '.Error': {
      color: '#ef4444',
      fontSize: '14px',
    },
  },
};

interface PaymentFormProps {
  clientSecret: string;
  communityId: string;
  communityName: string;
  subscriptionId: string;
  trialEndDate?: string;
  trialEligible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormProps {
  communityName: string;
  communityId: string;
  subscriptionId: string;
  trialEndDate?: string;
  trialEligible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ communityName, communityId, subscriptionId, trialEndDate, trialEligible, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let confirmError: any = null;
      
      // Use confirmSetup for trial (SetupIntent) or confirmPayment for immediate billing (PaymentIntent)
      if (trialEligible) {
        const result = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/billing/success`,
          },
          redirect: 'if_required',
        });
        confirmError = result.error;
      } else {
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/billing/success`,
          },
          redirect: 'if_required',
        });
        confirmError = result.error;
      }

      if (confirmError) {
        if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
          setErrorMessage(confirmError.message || 'Payment failed');
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
        setIsProcessing(false);
      } else {
        // Confirm subscription status with backend
        try {
          const authToken = localStorage.getItem('community_auth_token');
          await fetch('/api/billing/confirm-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ communityId, subscriptionId }),
            credentials: 'include',
          });
        } catch (confirmErr) {
          console.error('Error confirming subscription:', confirmErr);
        }
        
        toast({
          title: trialEligible ? 'Payment Method Saved!' : 'Subscription Activated!',
          description: trialEligible 
            ? 'Your subscription is now active with a 14-day free trial.'
            : 'Your subscription is now active. You will be charged $50 CAD.',
        });
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-copper-500/20">
            <CreditCard className="w-5 h-5 text-copper-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Payment Details</h3>
            <p className="text-sm text-white/60">Subscribing to {communityName}</p>
          </div>
        </div>

        {trialEligible ? (
          <div className="p-4 rounded-lg bg-jade-500/10 border border-jade-500/30 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-jade-400" />
              <span className="text-jade-400 font-medium text-sm">14-day free trial</span>
            </div>
            <p className="text-white/60 text-xs mt-1 ml-6">
              {trialEndDate 
                ? `Your card will be charged $50 CAD on ${new Date(trialEndDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : 'Your card will be charged $50 CAD after the 14-day trial ends'
              }
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-copper-500/10 border border-copper-500/30 mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-copper-400" />
              <span className="text-copper-400 font-medium text-sm">Immediate billing</span>
            </div>
            <p className="text-white/60 text-xs mt-1 ml-6">
              Your card will be charged $50 CAD now. Your trial has already been used.
            </p>
          </div>
        )}

        <PaymentElement 
          onReady={() => setIsReady(true)}
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'CA',
                },
              },
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !isReady}
          className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold py-6"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : !isReady ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading...
            </>
          ) : trialEligible ? (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Start Free Trial
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Subscribe Now - $50/month
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-white/60 hover:text-white"
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe. Your payment info is encrypted.</span>
      </div>
    </form>
  );
}

export function CustomPaymentForm({ clientSecret, communityId, communityName, subscriptionId, trialEndDate, trialEligible, onSuccess, onCancel }: PaymentFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: stripeAppearance,
  };

  return (
    <Card className="premium-surface-elevated border-white/10">
      <CardContent className="pt-6">
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm 
            communityId={communityId}
            communityName={communityName}
            subscriptionId={subscriptionId}
            trialEndDate={trialEndDate}
            trialEligible={trialEligible}
            onSuccess={onSuccess} 
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

interface CustomPaymentFormWrapperProps {
  communityId: string;
  communityName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomPaymentFormWrapper({ 
  communityId, 
  communityName, 
  onSuccess, 
  onCancel 
}: CustomPaymentFormWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | undefined>(undefined);
  const [trialEligible, setTrialEligible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createSubscription = async () => {
      try {
        const authToken = localStorage.getItem('community_auth_token');
        if (!authToken) {
          throw new Error('Please log in to subscribe');
        }

        const response = await fetch('/api/billing/create-subscription-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ communityId }),
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create subscription');
        }

        const data = await response.json();
        
        // Handle community reactivation (had active subscription but was in draft)
        if (data.reactivated) {
          toast({
            title: 'Community Reactivated!',
            description: 'Your community is now visible again with your existing subscription.',
          });
          onSuccess();
          return;
        }
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId);
          setTrialEligible(data.trialEligible ?? true);
          if (data.trialEnd) {
            setTrialEndDate(data.trialEnd);
          }
        } else if (data.status === 'trialing' || data.status === 'active') {
          toast({
            title: data.trialEligible ? 'Subscription Activated' : 'Subscription Activated!',
            description: data.trialEligible 
              ? 'Your 14-day free trial has started!'
              : 'Your subscription is now active.',
          });
          onSuccess();
        } else {
          throw new Error('Unable to initialize payment');
        }
      } catch (err: any) {
        console.error('Subscription creation error:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message || 'Failed to initialize payment form',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [communityId, onSuccess]);

  if (isLoading) {
    return (
      <Card className="premium-surface-elevated border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
            <p className="text-white/60">Setting up secure payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="premium-surface-elevated border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-center">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel}>
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-copper-500 hover:bg-copper-600 text-black"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret || !subscriptionId) {
    return null;
  }

  return (
    <CustomPaymentForm
      clientSecret={clientSecret}
      communityId={communityId}
      communityName={communityName}
      subscriptionId={subscriptionId}
      trialEndDate={trialEndDate}
      trialEligible={trialEligible}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

interface OrganizerPaymentFormWrapperProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrganizerPaymentFormWrapper({ 
  onSuccess, 
  onCancel 
}: OrganizerPaymentFormWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | undefined>(undefined);
  const [trialEligible, setTrialEligible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createSubscription = async () => {
      try {
        const authToken = localStorage.getItem('community_auth_token');
        if (!authToken) {
          throw new Error('Please log in to subscribe');
        }

        const response = await fetch('/api/billing/organizer/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create subscription');
        }

        const data = await response.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId);
          setTrialEligible(data.trialEligible ?? true);
          if (data.trialEnd) {
            setTrialEndDate(data.trialEnd);
          }
        } else if (data.status === 'trialing' || data.status === 'active') {
          toast({
            title: data.trialEligible ? 'Subscription Activated' : 'Subscription Activated!',
            description: data.trialEligible 
              ? 'Your 14-day free trial has started!'
              : 'Your subscription is now active.',
          });
          onSuccess();
        } else {
          throw new Error('Unable to initialize payment');
        }
      } catch (err: any) {
        console.error('Subscription creation error:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message || 'Failed to initialize payment form',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [onSuccess]);

  if (isLoading) {
    return (
      <Card className="premium-surface-elevated border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-copper-400" />
            <p className="text-white/60">Setting up secure payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="premium-surface-elevated border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-center">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel}>
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-copper-500 hover:bg-copper-600 text-black"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret || !subscriptionId) {
    return null;
  }

  return (
    <OrganizerPaymentForm
      clientSecret={clientSecret}
      subscriptionId={subscriptionId}
      trialEndDate={trialEndDate}
      trialEligible={trialEligible}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

interface OrganizerPaymentFormProps {
  clientSecret: string;
  subscriptionId: string;
  trialEndDate?: string;
  trialEligible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrganizerPaymentForm({ clientSecret, subscriptionId, trialEndDate, trialEligible, onSuccess, onCancel }: OrganizerPaymentFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: stripeAppearance,
  };

  return (
    <Card className="premium-surface-elevated border-white/10">
      <CardContent className="pt-6">
        <Elements stripe={stripePromise} options={options}>
          <OrganizerCheckoutForm 
            subscriptionId={subscriptionId}
            trialEndDate={trialEndDate}
            trialEligible={trialEligible}
            onSuccess={onSuccess} 
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

interface OrganizerCheckoutFormProps {
  subscriptionId: string;
  trialEndDate?: string;
  trialEligible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

function OrganizerCheckoutForm({ subscriptionId, trialEndDate, trialEligible, onSuccess, onCancel }: OrganizerCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let confirmError: any = null;
      
      if (trialEligible) {
        const result = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/billing/success`,
          },
          redirect: 'if_required',
        });
        confirmError = result.error;
      } else {
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/billing/success`,
          },
          redirect: 'if_required',
        });
        confirmError = result.error;
      }

      if (confirmError) {
        setErrorMessage(confirmError.message || 'Payment failed. Please try again.');
        return;
      }

      const authToken = localStorage.getItem('community_auth_token');
      const confirmResponse = await fetch('/api/billing/organizer/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ subscriptionId }),
        credentials: 'include',
      });

      if (!confirmResponse.ok) {
        const confirmData = await confirmResponse.json();
        throw new Error(confirmData.error || 'Failed to confirm subscription');
      }

      toast({
        title: trialEligible ? 'Trial Started!' : 'Subscription Activated!',
        description: trialEligible 
          ? 'Your 14-day free trial has begun. Your payment method is saved for after the trial.'
          : 'Your subscription is now active. Thank you for subscribing!',
      });

      onSuccess();
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-copper-400 mb-2">
          <CreditCard className="w-5 h-5" />
          <span className="font-semibold">Payment Details</span>
        </div>
        
        {trialEligible && (
          <div className="bg-jade-500/10 border border-jade-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-jade-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-jade-300 font-medium">14-Day Free Trial</p>
                <p className="text-jade-400/80">
                  You won't be charged until {trialEndDate 
                    ? new Date(trialEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'your trial ends'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <PaymentElement 
          onReady={() => setIsReady(true)}
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !isReady}
          className="flex-1 bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-white font-semibold py-3"
          data-testid="button-subscribe-organizer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : trialEligible ? (
            'Start Free Trial'
          ) : (
            'Subscribe Now'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-white/60 hover:text-white"
          data-testid="button-cancel-organizer-payment"
        >
          Cancel
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe. Your payment info is encrypted.</span>
      </div>
    </form>
  );
}
