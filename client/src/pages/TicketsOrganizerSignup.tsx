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
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessEmail: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

type OrgangizerSignupForm = z.infer<typeof organizerSignupSchema>;

export function TicketsOrganizerSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';

  const form = useForm<OrgangizerSignupForm>({
    resolver: zodResolver(organizerSignupSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: OrgangizerSignupForm) => {
      const response = await apiRequest('POST', '/api/tickets/organizers/connect', {
        userId: generateUUID(), // Generate proper UUID for validation
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        returnUrl: `${window.location.origin}/tickets/organizer/dashboard`,
        refreshUrl: `${window.location.origin}/tickets/organizer/connect`
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
      
      if (result.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = result.onboardingUrl;
      } else if (result.testMode) {
        // Test mode - go directly to dashboard
        toast({
          title: "Account created successfully!",
          description: "Welcome to the organizer dashboard.",
          variant: "default"
        });
        setLocation('/tickets/organizer/dashboard');
      } else {
        // Go to connect page for manual setup
        setLocation('/tickets/organizer/connect');
      }
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

  const onSubmit = (data: OrgangizerSignupForm) => {
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
                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-orange-400" />
                      Business Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Business Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your business or organization name"
                              className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                              data-testid="input-business-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Business Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="contact@yourbusiness.com"
                              className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                              data-testid="input-business-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-400" />
                      Your Information
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John"
                                className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                                data-testid="input-first-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Doe"
                                className="mobile-form-input bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                                data-testid="input-last-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Information Alert */}
                  <Alert className="border-blue-200 bg-blue-50 text-blue-900">
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      After creating your account, you'll be guided through Stripe Connect setup to start receiving payments.
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