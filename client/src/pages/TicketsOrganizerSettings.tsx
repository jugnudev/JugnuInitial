import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Settings, User, CreditCard, Mail, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Organizer {
  id: string;
  businessName: string;
  businessEmail: string;
  status: 'active' | 'suspended';
  payoutMethod: string;
  payoutEmail: string;
}

const payoutSettingsSchema = z.object({
  payoutMethod: z.string().min(1, "Payout method is required"),
  payoutEmail: z.string().email("Please enter a valid email address"),
});

type PayoutSettingsForm = z.infer<typeof payoutSettingsSchema>;

export function TicketsOrganizerSettings() {
  const { toast } = useToast();

  // Use session-based auth - backend looks up organizer by session userId
  const { data, isLoading } = useQuery<{ ok: boolean; organizer: Organizer }>({
    queryKey: ['/api/tickets/organizers/me'],
  });

  const form = useForm<PayoutSettingsForm>({
    resolver: zodResolver(payoutSettingsSchema),
    defaultValues: {
      payoutMethod: 'e-transfer',
      payoutEmail: '',
    }
  });

  // Update form when data loads
  useEffect(() => {
    if (data?.organizer && !form.formState.isDirty) {
      form.reset({
        payoutMethod: data.organizer.payoutMethod || 'e-transfer',
        payoutEmail: data.organizer.payoutEmail || data.organizer.businessEmail || '',
      });
    }
  }, [data?.organizer, form])

  const updateSettingsMutation = useMutation({
    mutationFn: async (values: PayoutSettingsForm) => {
      const response = await fetch('/api/tickets/organizers/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
      toast({
        title: "Settings updated",
        description: "Your payout settings have been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: PayoutSettingsForm) => {
    updateSettingsMutation.mutate(values);
  };

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
            Manage your organizer account preferences
          </p>
        </div>

        <div className="max-w-4xl">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
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
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact support to change your business name
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      value={organizer?.businessEmail || ''}
                      disabled
                      data-testid="input-business-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact support to change your business email
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="status">Account Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${organizer?.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="capitalize">{organizer?.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payout Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive payments from ticket sales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="payoutMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payout Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-payout-method">
                                  <SelectValue placeholder="Select payout method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="e-transfer">E-transfer</SelectItem>
                                <SelectItem value="direct-deposit">Direct Deposit</SelectItem>
                                <SelectItem value="paypal">PayPal (Coming Soon)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="payoutEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payout Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter email for payouts"
                                {...field}
                                data-testid="input-payout-email"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              For e-transfer payments, this is where you'll receive your earnings
                            </p>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-settings"
                      >
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payout Schedule</CardTitle>
                  <CardDescription>
                    How and when you receive your earnings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Frequency:</span>
                    <span className="text-sm text-muted-foreground">Weekly (Fridays)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Minimum amount:</span>
                    <span className="text-sm text-muted-foreground">$25.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Platform fee:</span>
                    <span className="text-sm text-muted-foreground">3% + $0.30 per transaction</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Processing time:</span>
                    <span className="text-sm text-muted-foreground">2-3 business days</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Enhanced Security Coming Soon</h3>
                    <p className="text-muted-foreground mb-4">
                      We're working on advanced security features including:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Two-factor authentication</li>
                      <li>• Password management</li>
                      <li>• Login history and activity logs</li>
                      <li>• API key management</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Security Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm">Account verified</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span className="text-sm">Two-factor authentication</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}