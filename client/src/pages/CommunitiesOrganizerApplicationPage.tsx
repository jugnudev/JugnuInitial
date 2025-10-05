import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Building2, CheckCircle, Info } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const organizerApplicationSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessWebsite: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  businessDescription: z.string().min(10, 'Please provide a detailed business description (min 10 characters)'),
  businessType: z.enum(['event_organizer', 'venue', 'artist', 'promoter', 'other'], {
    errorMap: () => ({ message: 'Please select a valid business type' })
  }),
  socialMediaHandles: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  businessEmail: z.string().email('Invalid business email address'),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
});

type OrganizerApplicationFormData = z.infer<typeof organizerApplicationSchema>;

export function CommunitiesOrganizerApplicationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Authentication is always available (platform-wide)
  if (false) { // Never show coming soon message
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Communities Coming Soon</h2>
                  <p className="text-muted-foreground mt-2">
                    Our community features are not yet available. Check back soon!
                  </p>
                </div>
                <Button 
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get user profile to check auth and existing applications
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: (failureCount, error: any) => {
      // If unauthorized, redirect to sign-in
      const status = error?.status || error?.response?.status;
      if (status === 401) {
        queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/account/signin');
        return false;
      }
      return failureCount < 2;
    }
  });

  const form = useForm<OrganizerApplicationFormData>({
    resolver: zodResolver(organizerApplicationSchema),
    defaultValues: {
      businessName: '',
      businessWebsite: 'https://',
      businessDescription: '',
      businessType: undefined,
      socialMediaHandles: {
        instagram: '',
        facebook: '',
        twitter: '',
        linkedin: '',
        website: '',
      },
      businessEmail: '',
      businessPhone: '',
      businessAddress: '',
    }
  });

  const applicationMutation = useMutation({
    mutationFn: (data: OrganizerApplicationFormData) => 
      apiRequest('POST', '/api/organizers/apply', data),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        toast({
          title: 'Registration submitted!',
          description: 'Your business registration has been submitted successfully. Our team will review it shortly and activate your account.',
        });
        setLocation('/account/profile?tab=organizer');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit registration.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      // Handle 401 errors by redirecting to sign-in
      const status = error?.status || error?.response?.status;
      if (status === 401) {
        queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/account/signin');
        return;
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: OrganizerApplicationFormData) => {
    applicationMutation.mutate(data);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!profileData?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Alert>
                  <AlertDescription>
                    Please sign in to register your business account.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => setLocation('/account/signin')}
                  className="w-full"
                  data-testid="button-signin"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const user = profileData.user;
  const organizerApplication = profileData.organizerApplication;
  const organizer = profileData.organizer;

  // If user already has an organizer account or pending application
  if (organizer || organizerApplication) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  {organizer ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <Info className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {organizer ? 'Business Account Active' : 'Registration Pending'}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {organizer 
                      ? 'Your business account is active and ready to use.'
                      : `Your business registration is ${organizerApplication?.status}. Check your profile for updates.`
                    }
                  </p>
                </div>
                <Button 
                  onClick={() => setLocation('/account/profile?tab=organizer')}
                  className="w-full"
                  data-testid="button-profile"
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container max-w-2xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/account/profile')}
            className="mb-3 sm:mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 px-2 sm:px-0">Register Your Business Account</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-3 sm:px-0">
              Register your business with Jugnu to access event hosting, promotion tools, and community partnerships.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Business Registration</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Register your business details to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Basic Business Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-medium">Business Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Event Company"
                    data-testid="input-business-name"
                    {...form.register('businessName')}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.businessName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail" className="text-sm sm:text-base">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder="business@example.com"
                      data-testid="input-business-email"
                      {...form.register('businessEmail')}
                    />
                    {form.formState.errors.businessEmail && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.businessEmail.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone" className="text-sm sm:text-base">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      placeholder="(604) 123-4567"
                      data-testid="input-business-phone"
                      {...form.register('businessPhone')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessWebsite">Business Website</Label>
                  <Input
                    id="businessWebsite"
                    type="url"
                    placeholder="https://yourcompany.com"
                    data-testid="input-business-website"
                    {...form.register('businessWebsite')}
                  />
                  {form.formState.errors.businessWebsite && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.businessWebsite.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    placeholder="123 Main St, Vancouver, BC"
                    data-testid="input-business-address"
                    {...form.register('businessAddress')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Controller
                    name="businessType"
                    control={form.control}
                    render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                        data-testid="select-business-type"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event_organizer">Event Organizer</SelectItem>
                          <SelectItem value="venue">Venue</SelectItem>
                          <SelectItem value="artist">Artist/Performer</SelectItem>
                          <SelectItem value="promoter">Promoter</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.businessType && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.businessType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    placeholder="Describe your business, services, and what makes you unique..."
                    rows={4}
                    data-testid="input-business-description"
                    {...form.register('businessDescription')}
                  />
                  {form.formState.errors.businessDescription && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.businessDescription.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Social Media */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-medium">Social Media & Online Presence</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      placeholder="@yourbusiness"
                      data-testid="input-instagram"
                      {...form.register('socialMediaHandles.instagram')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      placeholder="facebook.com/yourbusiness"
                      data-testid="input-facebook"
                      {...form.register('socialMediaHandles.facebook')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      placeholder="@yourbusiness"
                      data-testid="input-twitter"
                      {...form.register('socialMediaHandles.twitter')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      placeholder="linkedin.com/company/yourbusiness"
                      data-testid="input-linkedin"
                      {...form.register('socialMediaHandles.linkedin')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Submit */}
              <div className="space-y-4">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Your business registration will be reviewed by our team. You'll receive an email notification once a decision is made.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full sm:flex-1"
                    disabled={applicationMutation.isPending}
                    data-testid="button-submit"
                  >
                    {applicationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4 mr-2" />
                        Register Business
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/account/profile')}
                    data-testid="button-cancel"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}