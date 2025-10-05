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
import { Loader2, Mail, ArrowLeft, User, Settings, LogOut, Building2, CheckCircle, Clock, XCircle, MapPin, Globe, Instagram, Twitter, Linkedin, Camera, Upload, Trash2 } from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';
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
  newsletter: z.boolean().optional(),
  
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

// Type definitions for organizer data from Supabase API (snake_case)
// Matches the actual database schema exactly (see shared/schema.ts lines 651-665)
interface OrganizerApiResponse {
  id: string;
  user_id: string;
  application_id?: string | null;  // optional reference
  business_name: string;            // notNull
  business_website?: string | null; // nullable
  business_description?: string | null; // nullable
  business_type: string;            // notNull
  status: string;                   // notNull with default
  verified: boolean;                // notNull with default
  created_at: string;               // notNull with default
  updated_at: string;               // notNull with default
  approved_by?: string | null;      // nullable reference
  approved_at: string;              // notNull with default
}

// Typed organizer object for component use (camelCase)
// Reflects actual Supabase schema with proper null handling
interface Organizer {
  id: string;
  userId: string;
  applicationId: string | null;
  businessName: string;
  businessWebsite: string | null;
  businessDescription: string | null;
  businessType: string;
  status: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string;  // Always present (notNull with default)
}

// Helper function to convert snake_case API response to camelCase
// Coerces undefined to null for consistent null handling
function mapOrganizerFromApi(raw: OrganizerApiResponse): Organizer {
  return {
    id: raw.id,
    userId: raw.user_id,
    applicationId: raw.application_id ?? null,
    businessName: raw.business_name,
    businessWebsite: raw.business_website ?? null,
    businessDescription: raw.business_description ?? null,
    businessType: raw.business_type,
    status: raw.status,
    verified: raw.verified,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    approvedBy: raw.approved_by ?? null,
    approvedAt: raw.approved_at
  };
}

export function CommunitiesProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'request' | 'confirm'>('request');
  const [pendingEmail, setPendingEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showCropDialog, setShowCropDialog] = useState(false);

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
      newsletter: user?.newsletter ?? false,
      
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
        newsletter: user.newsletter ?? false,
        
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

  // Profile picture upload mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'profile-picture.jpg');
      
      // Get auth token from localStorage for authentication
      const authToken = localStorage.getItem('community_auth_token');
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch('/api/auth/upload-profile-image', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        // Force refetch by removing cached data first
        queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        // Force immediate refetch
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
        toast({
          title: 'Profile picture updated',
          description: 'Your profile picture has been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to upload profile picture.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload profile picture.',
        variant: 'destructive',
      });
    }
  });

  // Remove profile picture mutation
  const removeProfileImageMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/auth/me', { profileImageUrl: null }),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        toast({
          title: 'Profile picture removed',
          description: 'Your profile picture has been removed successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to remove profile picture.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove profile picture.',
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
  const rawOrganizer = (profileData as any)?.organizer as OrganizerApiResponse | null;
  
  // Convert snake_case organizer data from Supabase to camelCase for consistent usage
  const organizer: Organizer | null = rawOrganizer ? mapOrganizerFromApi(rawOrganizer) : null;

  const getUserInitials = () => {
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-accent" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
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
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'approved':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Premium Header - Mobile Optimized */}
        <div className="relative mb-6 sm:mb-12">
          {/* Background Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
            <CardContent className="p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Profile Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-20 h-20 sm:w-20 sm:h-20 border-4 border-background shadow-lg">
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
                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text break-words">
                      {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium truncate">{user.email}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 sm:mt-3">
                      <Badge 
                        variant={user.emailVerified ? 'default' : 'secondary'}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                      {user.role === 'organizer' && organizer?.status === 'active' && (
                        <Badge className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-accent/10 text-accent border-accent/20">
                          <Building2 className="w-3 h-3 mr-1" />
                          Business
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions Section - Mobile Optimized */}
                <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => signOutMutation.mutate()}
                    disabled={signOutMutation.isPending}
                    data-testid="button-signout"
                    className="w-full sm:w-auto px-4 sm:px-6 font-medium border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 text-destructive hover:text-destructive"
                  >
                    {signOutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Sign Out</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-8">
          <div className="border-b border-border/50">
            <TabsList className="grid w-full max-w-full sm:max-w-md sm:mx-auto grid-cols-3 bg-muted/30 p-1 h-11 sm:h-12 rounded-md">
              <TabsTrigger 
                value="profile" 
                className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-4"
                aria-label="Profile"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Profile</span>
                <span className="sr-only sm:not-sr-only">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="organizer" 
                className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-4"
                aria-label="Business Account"
              >
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Business</span>
                <span className="sr-only sm:not-sr-only">Business</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-4"
                aria-label="Settings"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sr-only sm:not-sr-only">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 sm:space-y-8">
            {/* Profile Overview Card */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-card to-card/90">
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      </div>
                      <span className="truncate">Profile Information</span>
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                      Manage your personal information
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? 'outline' : 'default'}
                    size="default"
                    onClick={() => setIsEditing(!isEditing)}
                    data-testid="button-edit"
                    className="w-full sm:w-auto px-4 sm:px-6 font-medium"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {isEditing ? (
                  <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-6 sm:space-y-8">
                    {/* Basic Information Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-2 sm:gap-3 pb-2 border-b border-border/50">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">Basic Information</h3>
                      </div>
                      
                      {/* Profile Picture Upload Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">Profile Picture</Label>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                          <div className="flex-shrink-0">
                            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-border shadow-sm">
                              <AvatarImage src={user.profileImageUrl || undefined} />
                              <AvatarFallback className="text-base sm:text-lg font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                                {getUserInitials()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 w-full space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCropDialog(true)}
                                disabled={uploadProfileImageMutation.isPending}
                                data-testid="button-upload-profile-picture"
                                className="w-full sm:w-auto"
                              >
                                {uploadProfileImageMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span className="truncate">Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    <span className="truncate">Upload Photo</span>
                                  </>
                                )}
                              </Button>
                              {user.profileImageUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeProfileImageMutation.mutate()}
                                  disabled={removeProfileImageMutation.isPending}
                                  data-testid="button-remove-profile-picture"
                                  className="w-full sm:w-auto"
                                >
                                  {removeProfileImageMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      <span className="truncate">Removing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      <span className="truncate">Remove</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground text-center sm:text-left">
                              Upload a clear photo. JPG, PNG, or WebP up to 5MB.
                            </p>
                          </div>
                        </div>
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

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 pt-2">
                      <Button 
                        type="submit" 
                        disabled={updateMutation.isPending}
                        data-testid="button-save"
                        className="w-full sm:flex-1"
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
                        className="w-full sm:flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <TabsContent value="organizer" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 bg-clip-text text-transparent">Business Account Status</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Manage your business account application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                {organizer?.status === 'active' ? (
                  <div className="space-y-3 sm:space-y-6">
                    {/* Clean Verification Status */}
                    <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">Business Account Application</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">Your application has been approved</p>
                        </div>
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs sm:text-sm flex-shrink-0">
                          Approved
                        </Badge>
                      </div>
                    </div>

                    {/* Business Details */}
                    <div className="bg-card border border-border rounded-lg p-3 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                        </div>
                        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                          <div>
                            <h4 className="text-base sm:text-xl font-semibold text-foreground break-words">{organizer.businessName}</h4>
                            {organizer.businessDescription && (
                              <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">{organizer.businessDescription}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 pt-2 sm:pt-3 border-t border-border">
                            {organizer.businessType && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full flex-shrink-0"></div>
                                <span className="text-xs sm:text-sm font-medium text-foreground">Type:</span>
                                <span className="text-xs sm:text-sm text-muted-foreground capitalize truncate">{organizer.businessType.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            
                            {organizer.businessWebsite && (
                              <div className="flex items-start sm:items-center gap-2">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></div>
                                <span className="text-xs sm:text-sm font-medium text-foreground flex-shrink-0">Website:</span>
                                <a 
                                  href={organizer.businessWebsite} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors break-all min-w-0"
                                  data-testid="link-business-website"
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
                  <div className="space-y-3 sm:space-y-6">
                    {/* Premium Dark Warning Banner for Suspended/Inactive Business Account */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950/50 to-orange-950/30 border border-orange-500/30 rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-2xl backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10"></div>
                      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/5 via-transparent to-white/5" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 via-red-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl ring-2 sm:ring-4 ring-orange-500/20">
                            <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2 tracking-tight break-words">Business Account {organizer.status === 'suspended' ? 'Suspended' : 'Inactive'}</h3>
                          <p className="text-slate-300 font-medium text-sm sm:text-lg break-words">Your business account is currently {organizer.status} and cannot be used</p>
                        </div>
                        <div className="flex-shrink-0 self-start sm:self-center">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-xl px-3 py-1 sm:px-6 sm:py-3 text-xs sm:text-base font-bold tracking-wide capitalize">
                            <XCircle className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                            {organizer.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Premium Dark Business Details Card for Suspended/Inactive */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-8 shadow-2xl backdrop-blur-sm opacity-75">
                      <div className="flex items-start gap-3 sm:gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 rounded-lg sm:rounded-xl flex items-center justify-center shadow-xl ring-2 ring-slate-600/30">
                            <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-slate-300" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2 sm:space-y-4 min-w-0">
                          <div>
                            <h4 className="text-base sm:text-2xl font-bold text-white mb-1 sm:mb-2 tracking-tight break-words">{organizer.businessName}</h4>
                            {organizer.businessDescription && (
                              <p className="text-slate-300 leading-relaxed text-sm sm:text-lg break-words">{organizer.businessDescription}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 pt-2 sm:pt-4 border-t border-slate-700/50">
                            {organizer.businessType && (
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full shadow-lg flex-shrink-0"></div>
                                <span className="text-xs sm:text-base font-semibold text-slate-200">Type:</span>
                                <span className="text-xs sm:text-base text-slate-300 capitalize truncate">{organizer.businessType.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg flex-shrink-0"></div>
                              <span className="text-xs sm:text-base font-semibold text-slate-200">Status:</span>
                              <span className="text-xs sm:text-base text-orange-400 capitalize font-semibold truncate">{organizer.status}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : organizerApplication ? (
                  <div className="space-y-3 sm:space-y-6">
                    {/* Application Status Header */}
                    <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getApplicationStatusIcon(organizerApplication.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">Business Account Application</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">Application submitted for review</p>
                        </div>
                        <Badge variant="secondary" className={`text-xs sm:text-sm flex-shrink-0 ${organizerApplication.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : organizerApplication.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                          {organizerApplication.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Application Details */}
                    <div className="bg-card border border-border rounded-lg p-3 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                          <div>
                            <h4 className="text-base sm:text-xl font-semibold text-foreground break-words">{organizerApplication.businessName}</h4>
                            {organizerApplication.businessDescription && (
                              <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">{organizerApplication.businessDescription}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 pt-2 sm:pt-3 border-t border-border">
                            {organizerApplication.businessType && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full flex-shrink-0"></div>
                                <span className="text-xs sm:text-sm font-medium text-foreground">Type:</span>
                                <span className="text-xs sm:text-sm text-muted-foreground capitalize truncate">{organizerApplication.businessType.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full flex-shrink-0"></div>
                              <span className="text-xs sm:text-sm font-medium text-foreground">Applied:</span>
                              <span className="text-xs sm:text-sm text-muted-foreground">{new Date(organizerApplication.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {organizerApplication.status === 'pending' && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Your application is being reviewed. You'll be notified once a decision is made.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {organizerApplication.status === 'rejected' && organizerApplication.rejectionReason && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-foreground mb-1">Application Rejected</p>
                              <p className="text-xs sm:text-sm text-muted-foreground break-words">
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
          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Account Settings</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Manage your account preferences and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-2 sm:py-0">
                    <div className="flex-1">
                      <Label htmlFor="emailNotifications" className="text-sm sm:text-base">Email Notifications</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Receive notifications about your account
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

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-2 sm:py-0">
                    <div className="flex-1">
                      <Label htmlFor="marketingEmails" className="text-sm sm:text-base">Marketing Emails</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                      className="self-start sm:self-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-2 sm:py-0">
                    <div className="flex-1">
                      <Label htmlFor="newsletter" className="text-sm sm:text-base">Newsletter</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Receive our weekly newsletter with highlights
                      </p>
                    </div>
                    <Switch
                      id="newsletter"
                      checked={form.watch('newsletter') ?? false}
                      onCheckedChange={(checked) => {
                        form.setValue('newsletter', checked);
                        // Auto-save with complete profile data to satisfy validation
                        const currentValues = form.getValues();
                        updateMutation.mutate({
                          ...currentValues,
                          newsletter: checked
                        });
                      }}
                      data-testid="switch-newsletter"
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

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        onCropComplete={(blob) => {
          uploadProfileImageMutation.mutate(blob);
        }}
        circularCrop={true}
        title="Adjust Profile Picture"
      />
    </div>
  );
}