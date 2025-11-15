import { useQuery } from "@tanstack/react-query";
import { User, ExternalLink, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Organizer {
  id: string;
  businessName: string;
  businessEmail: string;
  status: 'active' | 'suspended' | 'pending';
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
}

export function TicketsOrganizerSettings() {
  // Use session-based auth - backend looks up organizer by session userId
  const { data, isLoading } = useQuery<{ ok: boolean; organizer: Organizer }>({
    queryKey: ['/api/tickets/organizers/me'],
  });

  if (!data && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-fraunces mb-4">Business Account Required</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You need an approved business account to access settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const organizer = data?.organizer;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-fraunces mb-2">Account Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your business account information
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={organizer?.businessName || ''}
                  disabled
                  data-testid="input-business-name"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Contact support to update your business name
                </p>
              </div>
              
              <div>
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input
                  id="businessEmail"
                  value={organizer?.businessEmail || ''}
                  disabled
                  data-testid="input-business-email"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Contact support to update your business email
                </p>
              </div>

              <div>
                <Label>Account Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  {organizer?.status === 'active' ? (
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  ) : organizer?.status === 'suspended' ? (
                    <Badge variant="destructive">
                      Suspended
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Processing
              </CardTitle>
              <CardDescription>
                Powered by Stripe Connect for secure, direct payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Stripe Status:</span>
                <div className="flex items-center gap-2">
                  {organizer?.stripeChargesEnabled ? (
                    <Badge variant="default" className="bg-green-600">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Ticket Revenue:</span>
                <span className="text-sm text-green-600 font-semibold">You keep 100%</span>
              </div>

              {organizer?.stripeAccountId && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Payouts Enabled:</span>
                    <span className="text-sm text-muted-foreground">
                      {organizer.stripePayoutsEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                      data-testid="button-stripe-dashboard"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Stripe Dashboard
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Manage payouts, view reports, and update banking details in Stripe
                    </p>
                  </div>
                </>
              )}

              {!organizer?.stripeAccountId && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    Connect your Stripe account in the Communities Settings tab to start accepting payments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}