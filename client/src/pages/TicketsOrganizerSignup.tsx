import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, User, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { nanoid } from "nanoid";

// Generate a UUID v4 format for demo purposes
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const organizerSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  payoutMethod: z.enum(['etransfer', 'paypal', 'manual']).optional(),
  payoutEmail: z.string().email("Please enter a valid email address").optional(),
});

type OrganizerSignupForm = z.infer<typeof organizerSignupSchema>;

export function TicketsOrganizerSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';

  const form = useForm<OrganizerSignupForm>({
    resolver: zodResolver(organizerSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      payoutMethod: undefined,
      payoutEmail: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: OrganizerSignupForm) => {
      const response = await apiRequest('POST', '/api/tickets/organizers/signup', {
        name: data.name,
        email: data.email,
        payoutMethod: data.payoutMethod || 'etransfer',
        payoutEmail: data.payoutEmail || data.email
      });
      
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'Signup failed');
      return result;
    },
    onSuccess: (result) => {
      console.log('[OrganizerSignup] Success:', result);
      
      // Store organizer ID for session
      if (result.organizerId) {
        localStorage.setItem('ticketsOrganizerId', result.organizerId);
      }
      
      // MoR Model: Go directly to dashboard (no Connect onboarding needed)
      toast({
        title: "Account created successfully!",
        description: "Welcome to the organizer dashboard. You can start creating events immediately.",
        variant: "default"
      });
      setLocation('/tickets/organizer/dashboard');
    },
    onError: (error: any) => {
      console.error('[OrganizerSignup] Error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: OrganizerSignupForm) => {
    console.log('[OrganizerSignup] Submitting:', data);
    setIsSubmitting(true);
    signupMutation.mutate(data);
  };

  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Coming Soon</h1>
        <p className="text-lg text-muted-foreground">
          Organizer signup will be available soon.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-fraunces mb-4">Create Organizer Account</h1>
            <p className="text-lg text-muted-foreground">
              Start selling tickets for your events with our premium platform
            </p>
          </div>

          {/* Signup Form */}
          <Card className="premium-surface-elevated border border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl font-fraunces text-white">Get Started</CardTitle>
              <CardDescription className="text-gray-400">
                Create your organizer account to begin selling tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-400" />
                      Your Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your name or organization name"
                              className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                              data-testid="input-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Payout Settings (Optional) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-orange-400" />
                      Payout Preferences (Optional)
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="payoutMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Preferred Payout Method</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full mobile-form-input bg-gray-800/50 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-md p-3"
                              data-testid="select-payout-method"
                            >
                              <option value="">Select method (default: e-transfer)</option>
                              <option value="etransfer">E-Transfer</option>
                              <option value="paypal">PayPal</option>
                              <option value="manual">Manual/Other</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payoutEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Payout Email (if different)</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Leave blank to use your main email"
                              className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                              data-testid="input-payout-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Information Alert */}
                  <Alert className="border-green-200 bg-green-50 text-green-900">
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Your account will be active immediately after creation. Start creating events and selling tickets right away!
                    </AlertDescription>
                  </Alert>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || signupMutation.isPending}
                    className="w-full premium-button-primary mobile-checkout-btn"
                    data-testid="button-create-account"
                  >
                    {isSubmitting || signupMutation.isPending ? (
                      "Creating Account..."
                    ) : (
                      <>
                        Create Account & Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Back to Dashboard */}
                  <div className="text-center pt-4">
                    <Link href="/tickets/organizer/dashboard">
                      <Button variant="ghost" className="text-gray-400 hover:text-white">
                        ← Back to Dashboard
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="premium-surface border border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Easy Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Get started in minutes with our streamlined onboarding process
                </p>
              </CardContent>
            </Card>

            <Card className="premium-surface border border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Powered by Stripe for safe and reliable payment processing
                </p>
              </CardContent>
            </Card>

            <Card className="premium-surface border border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Track sales, manage orders, and grow your events with detailed analytics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}