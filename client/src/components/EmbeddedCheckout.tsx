import { useState, useEffect } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  clientSecret: string;
  orderId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function CheckoutForm({ clientSecret, orderId, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.log('[EmbeddedCheckout] Stripe not loaded yet');
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tickets/order/success?order_id=${orderId}`,
        },
        redirect: "if_required"
      });

      if (error) {
        console.error('[EmbeddedCheckout] Payment error:', error);
        setMessage(error.message || "An error occurred during payment");
        onError(error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: error.message || "Please check your payment details and try again.",
          variant: "destructive"
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log('[EmbeddedCheckout] Payment succeeded:', paymentIntent.id);
        setMessage("Payment succeeded!");
        toast({
          title: "Payment Successful!",
          description: "Your tickets have been purchased successfully.",
          variant: "default"
        });
        onSuccess();
      }
    } catch (err) {
      console.error('[EmbeddedCheckout] Unexpected error:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setMessage(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element with premium styling */}
      <div className="premium-surface-elevated p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Information</h3>
        <PaymentElement 
          options={{
            layout: "tabs"
          }}
        />
      </div>

      {/* Address Element for billing */}
      <div className="premium-surface-elevated p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
        <AddressElement 
          options={{
            mode: 'billing',
            allowedCountries: ['CA', 'US']
          }}
        />
      </div>

      {/* Error/Success Messages */}
      {message && (
        <Alert className={message.includes("succeeded") ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}>
          {message.includes("succeeded") ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={message.includes("succeeded") ? "text-green-200" : "text-red-200"}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Premium Submit Button */}
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="premium-button w-full text-lg py-6"
        data-testid="button-complete-payment"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Complete Payment
          </div>
        )}
      </Button>
    </form>
  );
}

interface EmbeddedCheckoutProps {
  clientSecret: string;
  orderId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function EmbeddedCheckout({ clientSecret, orderId, onSuccess, onError }: EmbeddedCheckoutProps) {
  const [elementsOptions, setElementsOptions] = useState<StripeElementsOptions | null>(null);

  useEffect(() => {
    if (clientSecret) {
      setElementsOptions({
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#d4af37', // Gold primary color
            colorBackground: '#1a1a1a', // Dark background
            colorText: '#ffffff', // White text
            colorDanger: '#ef4444', // Error color
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px'
          },
          rules: {
            '.Tab': {
              backgroundColor: '#2a2a2a',
              border: '1px solid #374151',
              color: '#ffffff'
            },
            '.Tab--selected': {
              backgroundColor: '#d4af37',
              color: '#000000'
            },
            '.Input': {
              backgroundColor: '#2a2a2a',
              border: '1px solid #374151',
              color: '#ffffff'
            },
            '.Input:focus': {
              border: '1px solid #d4af37',
              boxShadow: '0 0 0 1px #d4af37'
            },
            '.Label': {
              color: '#d1d5db'
            }
          }
        }
      });
    }
  }, [clientSecret]);

  if (!elementsOptions) {
    return (
      <div className="premium-surface-elevated p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-white">Loading payment form...</span>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm 
        clientSecret={clientSecret}
        orderId={orderId}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}