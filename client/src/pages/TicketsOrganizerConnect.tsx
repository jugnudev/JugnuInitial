import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, ExternalLink, ArrowRight, Settings, CreditCard } from "lucide-react";

// Generate a UUID v4 format for demo purposes
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Organizer {
  id: string;
  businessName: string;
  businessEmail: string;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  status: 'pending' | 'active' | 'suspended';
}

export function TicketsOrganizerConnect() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  // Get organizer ID from localStorage
  const organizerId = localStorage.getItem('ticketsOrganizerId');

  const { data, isLoading, error, refetch } = useQuery<{ ok: boolean; organizer: Organizer }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled && !!organizerId,
    meta: {
      headers: {
        'x-organizer-id': organizerId || ''
      }
    }
  });

  // Check URL parameters for Stripe Connect return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Stripe Connected Successfully!",
        description: "Your payment account is now set up and ready to receive payments.",
        variant: "default"
      });
      
      // Refresh organizer data and redirect to dashboard
      refetch().then(() => {
        setTimeout(() => setLocation('/tickets/organizer/dashboard'), 1500);
      });
    } else if (urlParams.get('error')) {
      toast({
        title: "Connection Failed",
        description: "There was an issue connecting your Stripe account. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, refetch, setLocation]);

  const handleStripeConnect = async () => {
    if (!organizerId) {
      toast({
        title: "Business Account Required",
        description: "You need an approved business account to connect Stripe. Please apply at /business-signup first.",
        variant: "destructive"
      });
      setLocation('/business-signup');
      return;
    }

    setIsConnecting(true);

    try {
      // Use the correct Stripe Connect onboarding endpoint
      const response = await fetch('/api/tickets/connect/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-id': organizerId
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/tickets/organizer/connect?success=true`,
          refreshUrl: `${window.location.origin}/tickets/organizer/connect`
        })
      });

      const result = await response.json();
      
      if (result.ok && result.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to start Stripe onboarding');
      }
    } catch (error: any) {
      console.error('[OrganizerConnect] Error:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Coming Soon</h1>
        <p className="text-lg text-muted-foreground">
          Stripe Connect setup will be available soon.
        </p>
      </div>
    );
  }

  if (!organizerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-fraunces mb-4">Business Account Required</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You need an approved business account before connecting Stripe for ticketing
        </p>
        <Link href="/business-signup">
          <Button size="lg" data-testid="button-apply-business">
            Apply for Business Account
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Unable to load account</h1>
        <p className="text-muted-foreground mb-8">Please try again later.</p>
        <Button onClick={() => refetch()} data-testid="button-retry">
          Try Again
        </Button>
      </div>
    );
  }

  const organizer = data?.organizer;
  // Check Stripe Connect onboarding status
  const isConnected = organizer?.stripeOnboardingComplete && organizer?.stripeChargesEnabled;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-fraunces mb-4">Connect Your Payment Account</h1>
            <p className="text-lg text-muted-foreground">
              Set up Stripe to start receiving payments from ticket sales
            </p>
          </div>

          {/* Connection Status */}
          <Card className="premium-surface-elevated border border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-fraunces text-white flex items-center gap-3">
                {isConnected ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    Payment Account Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-orange-400" />
                    Payment Account Setup Required
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {isConnected ? (
                  "Your Stripe account is connected and ready to receive payments"
                ) : (
                  "Connect your Stripe account to start selling tickets and receiving payments"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50 text-green-900">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your payment account is fully set up! You can now create events and start selling tickets.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-3">
                    <Link href="/tickets/organizer/dashboard">
                      <Button className="premium-button-primary" data-testid="button-dashboard">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </Link>
                    
                    <Link href="/tickets/organizer/events/new">
                      <Button variant="outline" className="premium-button-secondary" data-testid="button-create-event">
                        Create Your First Event
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="border-orange-200 bg-orange-50 text-orange-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      To start selling tickets, you need to connect a Stripe account for secure payment processing.
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-white mb-1">Secure Payments</h4>
                        <p className="text-sm text-gray-400">
                          Industry-standard security with PCI compliance
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Settings className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-white mb-1">Easy Setup</h4>
                        <p className="text-sm text-gray-400">
                          Quick onboarding process managed by Stripe
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleStripeConnect}
                    disabled={isConnecting}
                    className="w-full premium-button-primary mobile-checkout-btn"
                    data-testid="button-connect-stripe"
                  >
                    {isConnecting ? (
                      "Connecting to Stripe..."
                    ) : (
                      <>
                        Connect with Stripe
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          {organizer && (
            <Card className="premium-surface border border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Business Name</label>
                    <p className="text-white">{organizer.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Business Email</label>
                    <p className="text-white">{organizer.businessEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Account Status</label>
                    <p className="text-white capitalize">{organizer.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="text-center mt-8">
            <Link href="/tickets/organizer/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                ← Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}