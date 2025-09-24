import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, User, Settings, LogOut, Building2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  location: z.string().max(100, 'Location must be under 100 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  socialInstagram: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export function CommunitiesProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Authentication is always available (platform-wide)
  if (false) { // Never show coming soon message
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-muted-foreground" />
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

  // Get user profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: (failureCount, error: any) => {
      // If unauthorized, redirect to sign-in (robust status check)
      const status = error?.status || error?.response?.status;
      if (status === 401) {
        queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/account/signin');
        return false;
      }
      return failureCount < 2;
    }
  });

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: profileData?.user?.firstName || '',
      lastName: profileData?.user?.lastName || '',
      bio: profileData?.user?.bio || '',
      location: profileData?.user?.location || '',
      website: profileData?.user?.website || '',
      socialInstagram: profileData?.user?.socialInstagram || '',
      socialTwitter: profileData?.user?.socialTwitter || '',
      socialLinkedin: profileData?.user?.socialLinkedin || '',
      emailNotifications: profileData?.user?.emailNotifications ?? true,
      marketingEmails: profileData?.user?.marketingEmails ?? false,
    }
  });

  // Update form when profile data loads
  if (profileData?.user && !isEditing) {
    const user = profileData.user;
    form.reset({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      socialInstagram: user.socialInstagram || '',
      socialTwitter: user.socialTwitter || '',
      socialLinkedin: user.socialLinkedin || '',
      emailNotifications: user.emailNotifications ?? true,
      marketingEmails: user.marketingEmails ?? false,
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileFormData) => 
      apiRequest('/api/auth/me', { method: 'PATCH', body: data }),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setIsEditing(false);
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  });

  const signOutMutation = useMutation({
    mutationFn: () => apiRequest('/api/auth/signout', { method: 'POST' }),
    onSuccess: () => {
      // Clear cached auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
      setLocation('/account/signin');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  });

  const onUpdateSubmit = (data: UpdateProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading profile...</span>
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
                    Unable to load profile. Please sign in again.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => setLocation('/account/signin')}
                  className="w-full"
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

  const getUserInitials = () => {
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary' as const;
      case 'approved':
        return 'default' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.emailVerified ? 'default' : 'secondary'}>
                  {user.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
                {user.role === 'organizer' && (
                  <Badge variant="outline">
                    <Building2 className="w-3 h-3 mr-1" />
                    Organizer
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              data-testid="button-signout"
            >
              {signOutMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organizer">Organizer</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Manage your public profile information
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          data-testid="input-firstname"
                          {...form.register('firstName')}
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          data-testid="input-lastname"
                          {...form.register('lastName')}
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself..."
                        rows={3}
                        data-testid="input-bio"
                        {...form.register('bio')}
                      />
                      {form.formState.errors.bio && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.bio.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="Vancouver, BC"
                          data-testid="input-location"
                          {...form.register('location')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://yourwebsite.com"
                          data-testid="input-website"
                          {...form.register('website')}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Social Media</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="socialInstagram">Instagram</Label>
                          <Input
                            id="socialInstagram"
                            placeholder="@username"
                            data-testid="input-instagram"
                            {...form.register('socialInstagram')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="socialTwitter">Twitter</Label>
                          <Input
                            id="socialTwitter"
                            placeholder="@username"
                            data-testid="input-twitter"
                            {...form.register('socialTwitter')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="socialLinkedin">LinkedIn</Label>
                          <Input
                            id="socialLinkedin"
                            placeholder="linkedin.com/in/username"
                            data-testid="input-linkedin"
                            {...form.register('socialLinkedin')}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={updateMutation.isPending}
                        data-testid="button-save"
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First name</Label>
                        <p className="mt-1">{user.firstName}</p>
                      </div>
                      <div>
                        <Label>Last name</Label>
                        <p className="mt-1">{user.lastName}</p>
                      </div>
                    </div>

                    {user.bio && (
                      <div>
                        <Label>Bio</Label>
                        <p className="mt-1 text-sm leading-relaxed">{user.bio}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {user.location && (
                        <div>
                          <Label>Location</Label>
                          <p className="mt-1">{user.location}</p>
                        </div>
                      )}
                      {user.website && (
                        <div>
                          <Label>Website</Label>
                          <p className="mt-1">
                            <a 
                              href={user.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {user.website}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>

                    {(user.socialInstagram || user.socialTwitter || user.socialLinkedin) && (
                      <>
                        <Separator />
                        <div>
                          <Label>Social Media</Label>
                          <div className="mt-2 space-y-1">
                            {user.socialInstagram && (
                              <p className="text-sm">Instagram: {user.socialInstagram}</p>
                            )}
                            {user.socialTwitter && (
                              <p className="text-sm">Twitter: {user.socialTwitter}</p>
                            )}
                            {user.socialLinkedin && (
                              <p className="text-sm">LinkedIn: {user.socialLinkedin}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizer Tab */}
          <TabsContent value="organizer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organizer Status</CardTitle>
                <CardDescription>
                  Manage your organizer application and business profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {organizer ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">You are an approved organizer</span>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <h4 className="font-medium">{organizer.businessName}</h4>
                      <p className="text-sm text-muted-foreground">{organizer.businessDescription}</p>
                      <p className="text-sm">Type: {organizer.businessType}</p>
                      {organizer.businessWebsite && (
                        <p className="text-sm">
                          Website:{' '}
                          <a 
                            href={organizer.businessWebsite} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {organizer.businessWebsite}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                ) : organizerApplication ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getApplicationStatusIcon(organizerApplication.status)}
                      <span className="font-medium">Organizer Application</span>
                      <Badge variant={getStatusBadgeVariant(organizerApplication.status)}>
                        {organizerApplication.status}
                      </Badge>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <h4 className="font-medium">{organizerApplication.businessName}</h4>
                      <p className="text-sm text-muted-foreground">{organizerApplication.businessDescription}</p>
                      <p className="text-sm">Type: {organizerApplication.businessType}</p>
                      <p className="text-sm">Applied: {new Date(organizerApplication.createdAt).toLocaleDateString()}</p>
                      
                      {organizerApplication.status === 'pending' && (
                        <Alert>
                          <AlertDescription>
                            Your organizer application is being reviewed. You'll be notified once a decision is made.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {organizerApplication.status === 'rejected' && organizerApplication.rejectionReason && (
                        <Alert>
                          <AlertDescription>
                            <strong>Rejection reason:</strong> {organizerApplication.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You haven't applied to become an organizer yet.
                    </p>
                    <Button
                      onClick={() => setLocation('/account/apply-organizer')}
                      data-testid="button-apply-organizer"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Apply to become an organizer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your account and applications
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      {...form.register('emailNotifications')}
                      className="rounded"
                      data-testid="checkbox-email-notifications"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="marketingEmails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="marketingEmails"
                      {...form.register('marketingEmails')}
                      className="rounded"
                      data-testid="checkbox-marketing-emails"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label>Account Email</Label>
                    <p className="mt-1 text-sm">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user.emailVerified ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Verified</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">Not verified</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Account Created</Label>
                    <p className="mt-1 text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}