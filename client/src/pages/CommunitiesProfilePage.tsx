import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  
  // New profile fields for better customer profiling
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(), // Will be converted to date
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional(),
  interests: z.array(z.string()).optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  companyName: z.string().max(100, 'Company name must be under 100 characters').optional(),
  jobTitle: z.string().max(100, 'Job title must be under 100 characters').optional(),
  referralSource: z.string().optional(),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Email change schemas
const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
});

const confirmEmailChangeSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

type RequestEmailChangeFormData = z.infer<typeof requestEmailChangeSchema>;
type ConfirmEmailChangeFormData = z.infer<typeof confirmEmailChangeSchema>;

export function CommunitiesProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'request' | 'confirm'>('request');
  const [pendingEmail, setPendingEmail] = useState('');

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

  const user = (profileData as any)?.user;

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      socialInstagram: user?.socialInstagram || '',
      socialTwitter: user?.socialTwitter || '',
      socialLinkedin: user?.socialLinkedin || '',
      emailNotifications: user?.emailNotifications ?? true,
      marketingEmails: user?.marketingEmails ?? false,
      
      // New profile fields
      phoneNumber: user?.phoneNumber || '',
      dateOfBirth: user?.dateOfBirth || '',
      gender: user?.gender || 'prefer-not-to-say',
      interests: user?.interests || [],
      preferredLanguage: user?.preferredLanguage || 'en',
      timezone: user?.timezone || 'America/Vancouver',
      companyName: user?.companyName || '',
      jobTitle: user?.jobTitle || '',
      referralSource: user?.referralSource || '',
    }
  });

  // Update form when profile data loads (use useEffect to avoid infinite render loop)
  useEffect(() => {
    if (user && !isEditing) {
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
        
        // New profile fields
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || 'prefer-not-to-say',
        interests: user.interests || [],
        preferredLanguage: user.preferredLanguage || 'en',
        timezone: user.timezone || 'America/Vancouver',
        companyName: user.companyName || '',
        jobTitle: user.jobTitle || '',
        referralSource: user.referralSource || '',
      });
    }
  }, [user, isEditing, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileFormData) => 
      apiRequest('PATCH', '/api/auth/me', data),
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
    mutationFn: () => apiRequest('POST', '/api/auth/signout'),
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

  // Email change forms
  const requestEmailForm = useForm<RequestEmailChangeFormData>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: {
      newEmail: '',
    }
  });

  const confirmEmailForm = useForm<ConfirmEmailChangeFormData>({
    resolver: zodResolver(confirmEmailChangeSchema),
    defaultValues: {
      newEmail: '',
      code: '',
    }
  });

  // Email change mutations
  const requestEmailChangeMutation = useMutation({
    mutationFn: (data: RequestEmailChangeFormData) => 
      apiRequest('POST', '/api/auth/request-email-change', data),
    onSuccess: (data) => {
      if (data.ok) {
        setPendingEmail(data.newEmail);
        setEmailChangeStep('confirm');
        confirmEmailForm.setValue('newEmail', data.newEmail);
        toast({
          title: 'Verification code sent',
          description: `Please check ${data.newEmail} for the verification code.`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send verification code.',
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

  const confirmEmailChangeMutation = useMutation({
    mutationFn: (data: ConfirmEmailChangeFormData) => 
      apiRequest('POST', '/api/auth/confirm-email-change', data),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setShowEmailChange(false);
        setEmailChangeStep('request');
        setPendingEmail('');
        requestEmailForm.reset();
        confirmEmailForm.reset();
        toast({
          title: 'Email changed successfully',
          description: 'Your email has been updated. Please check your new email for verification.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to change email.',
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

  const onUpdateSubmit = (data: UpdateProfileFormData) => {
    updateMutation.mutate(data);
  };

  const onRequestEmailChange = (data: RequestEmailChangeFormData) => {
    requestEmailChangeMutation.mutate(data);
  };

  const onConfirmEmailChange = (data: ConfirmEmailChangeFormData) => {
    confirmEmailChangeMutation.mutate(data);
  };

  const handleCancelEmailChange = () => {
    setShowEmailChange(false);
    setEmailChangeStep('request');
    setPendingEmail('');
    requestEmailForm.reset();
    confirmEmailForm.reset();
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

  const organizerApplication = (profileData as any)?.organizerApplication;
  const organizer = (profileData as any)?.organizer;

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

                    {/* Personal Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-phone"
                          {...form.register('phoneNumber')}
                        />
                        {form.formState.errors.phoneNumber && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.phoneNumber.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          data-testid="input-birthdate"
                          {...form.register('dateOfBirth')}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select 
                          value={form.watch('gender') || 'prefer-not-to-say'} 
                          onValueChange={(value) => form.setValue('gender', value)}
                        >
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="non-binary">Non-binary</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferredLanguage">Preferred Language</Label>
                        <Select 
                          value={form.watch('preferredLanguage') || 'en'} 
                          onValueChange={(value) => form.setValue('preferredLanguage', value)}
                        >
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="hi">हिन्दी</SelectItem>
                            <SelectItem value="ur">اردو</SelectItem>
                            <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Professional Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input
                            id="companyName"
                            placeholder="Your company"
                            data-testid="input-company"
                            {...form.register('companyName')}
                          />
                          {form.formState.errors.companyName && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.companyName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input
                            id="jobTitle"
                            placeholder="Your role"
                            data-testid="input-jobtitle"
                            {...form.register('jobTitle')}
                          />
                          {form.formState.errors.jobTitle && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.jobTitle.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interests */}
                    <div className="space-y-2">
                      <Label htmlFor="interests">Interests</Label>
                      <Textarea
                        id="interests"
                        placeholder="Tell us about your interests (comma separated): music, food, tech, sports..."
                        rows={2}
                        data-testid="input-interests"
                        value={form.watch('interests')?.join(', ') || ''}
                        onChange={(e) => {
                          const interestsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                          form.setValue('interests', interestsArray);
                        }}
                      />
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

                    {/* Personal Details */}
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Personal Details</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {user.phoneNumber && (
                            <div>
                              <Label>Phone Number</Label>
                              <p className="mt-1">{user.phoneNumber}</p>
                            </div>
                          )}
                          <div>
                            <Label>Date of Birth</Label>
                            <p className="mt-1">
                              {(() => {
                                if (!user.dateOfBirth) return 'Not provided';
                                const date = new Date(user.dateOfBirth);
                                return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid date';
                              })()}
                            </p>
                          </div>
                          {user.gender && (
                            <div>
                              <Label>Gender</Label>
                              <p className="mt-1 capitalize">{user.gender.replace('-', ' ')}</p>
                            </div>
                          )}
                          {user.preferredLanguage && (
                            <div>
                              <Label>Preferred Language</Label>
                              <p className="mt-1">
                                {user.preferredLanguage === 'en' ? 'English' :
                                 user.preferredLanguage === 'fr' ? 'Français' :
                                 user.preferredLanguage === 'hi' ? 'हिन्दी' :
                                 user.preferredLanguage === 'ur' ? 'اردو' :
                                 user.preferredLanguage === 'pa' ? 'ਪੰਜਾਬੀ' :
                                 user.preferredLanguage === 'zh' ? '中文' :
                                 user.preferredLanguage === 'es' ? 'Español' :
                                 user.preferredLanguage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>

                    {/* Professional Information */}
                    {(user.companyName || user.jobTitle) && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <Label className="text-base font-medium">Professional Information</Label>
                          <div className="grid grid-cols-2 gap-4">
                            {user.companyName && (
                              <div>
                                <Label>Company</Label>
                                <p className="mt-1">{user.companyName}</p>
                              </div>
                            )}
                            {user.jobTitle && (
                              <div>
                                <Label>Job Title</Label>
                                <p className="mt-1">{user.jobTitle}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Interests */}
                    {user.interests && user.interests.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-base font-medium">Interests</Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {user.interests.map((interest, index) => (
                              <Badge key={index} variant="secondary">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

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
                    <div className="flex items-center justify-between">
                      <Label>Account Email</Label>
                      {!showEmailChange && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEmailChange(true)}
                          data-testid="button-change-email"
                        >
                          Change Email
                        </Button>
                      )}
                    </div>

                    {!showEmailChange ? (
                      <>
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
                              <span className="text-sm text-yellow-600">Unverified</span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 p-4 border rounded-lg space-y-4">
                        {emailChangeStep === 'request' ? (
                          <form onSubmit={requestEmailForm.handleSubmit(onRequestEmailChange)} className="space-y-4">
                            <div>
                              <Label htmlFor="newEmail">New Email Address</Label>
                              <Input
                                id="newEmail"
                                type="email"
                                placeholder="Enter your new email address"
                                data-testid="input-new-email"
                                {...requestEmailForm.register('newEmail')}
                              />
                              {requestEmailForm.formState.errors.newEmail && (
                                <p className="text-sm text-destructive mt-1">
                                  {requestEmailForm.formState.errors.newEmail.message}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                disabled={requestEmailChangeMutation.isPending}
                                data-testid="button-send-verification"
                              >
                                {requestEmailChangeMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  'Send Verification Code'
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelEmailChange}
                                data-testid="button-cancel-email-change"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={confirmEmailForm.handleSubmit(onConfirmEmailChange)} className="space-y-4">
                            <div>
                              <Label>Verifying Email Change</Label>
                              <p className="text-sm text-muted-foreground">
                                We sent a verification code to {pendingEmail}
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="verificationCode">Verification Code</Label>
                              <Input
                                id="verificationCode"
                                type="text"
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                data-testid="input-verification-code"
                                {...confirmEmailForm.register('code')}
                              />
                              {confirmEmailForm.formState.errors.code && (
                                <p className="text-sm text-destructive mt-1">
                                  {confirmEmailForm.formState.errors.code.message}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                disabled={confirmEmailChangeMutation.isPending}
                                data-testid="button-confirm-email-change"
                              >
                                {confirmEmailChangeMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  'Confirm Email Change'
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelEmailChange}
                                data-testid="button-cancel-confirmation"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Account Created</Label>
                    <p className="mt-1 text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
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