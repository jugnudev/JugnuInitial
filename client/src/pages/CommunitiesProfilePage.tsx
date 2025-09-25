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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, ArrowLeft, User, Settings, LogOut, Building2, CheckCircle, Clock, XCircle, MapPin, Globe, Instagram, Twitter, Linkedin } from 'lucide-react';
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
  socialInstagram: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  
  // New profile fields for better customer profiling
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(), // Will be converted to date
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
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
  const [activeTab, setActiveTab] = useState('profile');

  // Handle hash-based navigation for direct tab access
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['profile', 'organizer', 'settings'].includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('profile'); // Default to profile if no valid hash
      }
    };

    // Handle initial hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Handle tab changes and keep URL in sync
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL hash to keep deep links working
    if (value === 'profile') {
      // For default tab, remove hash to keep URL clean
      if (window.location.hash) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else {
      window.location.hash = value;
    }
  };

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
      socialInstagram: user?.socialInstagram || '',
      socialTwitter: user?.socialTwitter || '',
      socialLinkedin: user?.socialLinkedin || '',
      emailNotifications: user?.emailNotifications ?? true,
      marketingEmails: user?.marketingEmails ?? false,
      
      // New profile fields
      phoneNumber: user?.phoneNumber || '',
      dateOfBirth: user?.dateOfBirth || '',
      gender: user?.gender || 'prefer-not-to-say',
      preferredLanguage: user?.preferredLanguage || 'en',
      timezone: user?.timezone || 'America/Vancouver',
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
        socialInstagram: user.socialInstagram || '',
        socialTwitter: user.socialTwitter || '',
        socialLinkedin: user.socialLinkedin || '',
        emailNotifications: user.emailNotifications ?? true,
        marketingEmails: user.marketingEmails ?? false,
        
        // New profile fields
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || 'prefer-not-to-say',
        preferredLanguage: user.preferredLanguage || 'en',
        timezone: user.timezone || 'America/Vancouver',
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
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 border-amber-300/30 shadow-amber-500/10 shadow-md font-semibold px-3 py-1';
      case 'approved':
        return 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/30 shadow-emerald-500/10 shadow-md font-semibold px-3 py-1';
      case 'rejected':
        return 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-700 dark:text-red-300 border-red-300/30 shadow-red-500/10 shadow-md font-semibold px-3 py-1';
      default:
        return 'bg-gradient-to-r from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-300 border-slate-300/30 shadow-slate-500/10 shadow-md font-semibold px-3 py-1';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Premium Header */}
        <div className="relative mb-12">
          {/* Background Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Profile Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {user.emailVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                      {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">{user.email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge 
                        variant={user.emailVerified ? 'default' : 'secondary'}
                        className="px-3 py-1 text-sm font-medium"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {user.emailVerified ? 'Verified Account' : 'Unverified'}
                      </Badge>
                      {user.role === 'organizer' && organizer?.status === 'active' && (
                        <Badge className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Verified Business Account
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions Section */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => signOutMutation.mutate()}
                    disabled={signOutMutation.isPending}
                    data-testid="button-signout"
                    className="px-6 font-medium border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 text-destructive hover:text-destructive"
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
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <div className="border-b border-border/50">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-muted/30 p-1 h-12">
              <TabsTrigger 
                value="profile" 
                className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="organizer" 
                className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Business Account
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-8">
            {/* Profile Overview Card */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-card to-card/90">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      Profile Information
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Manage your personal information and preferences
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? 'outline' : 'default'}
                    size="lg"
                    onClick={() => setIsEditing(!isEditing)}
                    data-testid="button-edit"
                    className="px-6 font-medium"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancel Changes' : 'Edit Profile'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-8">
                    {/* Basic Information Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                            First Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            data-testid="input-firstname"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('firstName')}
                          />
                          {form.formState.errors.firstName && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                            Last Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            data-testid="input-lastname"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('lastName')}
                          />
                          {form.formState.errors.lastName && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="bio" className="text-sm font-medium text-foreground">About You</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself and what brings you to our community..."
                          rows={4}
                          data-testid="input-bio"
                          className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-foreground"
                          {...form.register('bio')}
                        />
                        {form.formState.errors.bio && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.bio.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact & Location Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center">
                          <Mail className="w-3 h-3 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Contact & Location</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            Location
                          </Label>
                          <Input
                            id="location"
                            placeholder="Vancouver, BC"
                            data-testid="input-location"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('location')}
                          />
                        </div>

                      </div>
                    </div>

                    {/* Personal Details Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Personal Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">Phone Number</Label>
                          <Input
                            id="phoneNumber"
                            placeholder="+1 (555) 123-4567"
                            data-testid="input-phone"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('phoneNumber')}
                          />
                          {form.formState.errors.phoneNumber && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.phoneNumber.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            data-testid="input-birthdate"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('dateOfBirth')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="gender" className="text-sm font-medium text-foreground">Gender</Label>
                          <Select 
                            value={form.watch('gender') || 'prefer-not-to-say'} 
                            onValueChange={(value) => form.setValue('gender', value)}
                          >
                            <SelectTrigger data-testid="select-gender" className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20">
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

                        <div className="space-y-3">
                          <Label htmlFor="preferredLanguage" className="text-sm font-medium text-foreground">Preferred Language</Label>
                          <Select 
                            value={form.watch('preferredLanguage') || 'en'} 
                            onValueChange={(value) => form.setValue('preferredLanguage', value)}
                          >
                            <SelectTrigger data-testid="select-language" className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20">
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
                    </div>

                    {/* Social Media Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Social Media</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="socialInstagram" className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-pink-500" />
                            Instagram
                          </Label>
                          <Input
                            id="socialInstagram"
                            placeholder="@username"
                            data-testid="input-instagram"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('socialInstagram')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="socialTwitter" className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Twitter className="w-4 h-4 text-blue-400" />
                            Twitter
                          </Label>
                          <Input
                            id="socialTwitter"
                            placeholder="@username"
                            data-testid="input-twitter"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                            {...form.register('socialTwitter')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="socialLinkedin" className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Linkedin className="w-4 h-4 text-blue-600" />
                            LinkedIn
                          </Label>
                          <Input
                            id="socialLinkedin"
                            placeholder="linkedin.com/in/username"
                            data-testid="input-linkedin"
                            className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
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
                                // Handle date-only strings without timezone conversion
                                try {
                                  const dateString = user.dateOfBirth;
                                  if (dateString.includes('-')) {
                                    // For YYYY-MM-DD format, parse directly without timezone issues
                                    const [year, month, day] = dateString.split('-').map(Number);
                                    const date = new Date(year, month - 1, day); // month is 0-indexed
                                    return date.toLocaleDateString();
                                  } else {
                                    // Fallback for other formats
                                    const date = new Date(dateString);
                                    return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid date';
                                  }
                                } catch {
                                  return 'Invalid date';
                                }
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

          {/* Business Tab */}
          <TabsContent value="organizer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 bg-clip-text text-transparent">Business Account Status</CardTitle>
                <CardDescription>
                  Manage your business account application and premium profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {organizer?.status === 'active' ? (
                  <div className="space-y-6">
                    {/* Premium Verification Banner - Only for active (approved) organizers */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl p-6 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5"></div>
                      <div className="relative flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">Business Account Verified</h3>
                          <p className="text-emerald-700 dark:text-emerald-300 font-medium">Your business account has been approved and is now active</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-md px-4 py-2 text-sm font-semibold">
                            <Building2 className="w-4 h-4 mr-2" />
                            VERIFIED
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Premium Business Details Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{organizer.businessName}</h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{organizer.businessDescription}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</span>
                              <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{organizer.businessType}</span>
                            </div>
                            
                            {organizer.businessWebsite && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Website:</span>
                                <a 
                                  href={organizer.businessWebsite} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
                                >
                                  {organizer.businessWebsite.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : organizer ? (
                  <div className="space-y-6">
                    {/* Suspended/Inactive Business Account */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-orange-900/20 border border-orange-200/50 dark:border-orange-800/30 rounded-xl p-6 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5"></div>
                      <div className="relative flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                            <XCircle className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-1">Business Account {organizer.status === 'suspended' ? 'Suspended' : 'Inactive'}</h3>
                          <p className="text-orange-700 dark:text-orange-300 font-medium">Your business account is currently {organizer.status} and cannot be used</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 shadow-md px-4 py-2 text-sm font-semibold capitalize">
                            <XCircle className="w-4 h-4 mr-2" />
                            {organizer.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Business Details Card for Suspended/Inactive */}
                    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-6 shadow-md opacity-75">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{organizer.businessName}</h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{organizer.businessDescription}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</span>
                              <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{organizer.businessType}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</span>
                              <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{organizer.status}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : organizerApplication ? (
                  <div className="space-y-6">
                    {/* Application Status Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        {getApplicationStatusIcon(organizerApplication.status)}
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Business Account Application</span>
                      </div>
                      <div className={`inline-flex items-center rounded-full text-sm font-semibold capitalize ${getStatusBadgeStyle(organizerApplication.status)}`}>
                        {organizerApplication.status}
                      </div>
                    </div>
                    
                    {/* Enhanced Application Details */}
                    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-6 shadow-md">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{organizerApplication.businessName}</h4>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{organizerApplication.businessDescription}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{organizerApplication.businessType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Applied:</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{new Date(organizerApplication.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {organizerApplication.status === 'pending' && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <p className="text-amber-800 dark:text-amber-200 font-medium">
                              Your business account application is being reviewed. You'll be notified once a decision is made.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {organizerApplication.status === 'rejected' && organizerApplication.rejectionReason && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200/50 dark:border-red-800/30 rounded-lg">
                          <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div>
                              <p className="text-red-800 dark:text-red-200 font-medium mb-1">Application Rejected</p>
                              <p className="text-red-700 dark:text-red-300 text-sm">
                                <strong>Reason:</strong> {organizerApplication.rejectionReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You haven't applied for a business account yet.
                    </p>
                    <Button
                      onClick={() => setLocation('/account/apply-organizer')}
                      data-testid="button-apply-organizer"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Create your business account
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
                    <Switch
                      id="emailNotifications"
                      checked={form.watch('emailNotifications') ?? true}
                      onCheckedChange={(checked) => {
                        form.setValue('emailNotifications', checked);
                        // Auto-save with complete profile data to satisfy validation
                        const currentValues = form.getValues();
                        updateMutation.mutate({
                          ...currentValues,
                          emailNotifications: checked
                        });
                      }}
                      data-testid="switch-email-notifications"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="marketingEmails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={form.watch('marketingEmails') ?? false}
                      onCheckedChange={(checked) => {
                        form.setValue('marketingEmails', checked);
                        // Auto-save with complete profile data to satisfy validation
                        const currentValues = form.getValues();
                        updateMutation.mutate({
                          ...currentValues,
                          marketingEmails: checked
                        });
                      }}
                      data-testid="switch-marketing-emails"
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
                            {/* Hidden field for newEmail - required by schema */}
                            <input type="hidden" {...confirmEmailForm.register('newEmail')} value={pendingEmail} />
                            
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