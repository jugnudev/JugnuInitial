import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, ArrowLeft, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  location: z.string().max(100, 'Location must be under 100 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal(''))
});

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric')
});

type SignupFormData = z.infer<typeof signupSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export function CommunitiesSignupPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [signupData, setSignupData] = useState<SignupFormData | null>(null);
  const { toast } = useToast();

  // Check if Communities is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_COMMUNITIES === 'true';
  
  if (!isEnabled) {
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

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      email: '',
      firstName: '',
      lastName: '',
      bio: '',
      location: '',
      website: ''
    }
  });

  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' }
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupFormData) => 
      apiRequest('/api/auth/signup', { method: 'POST', body: data }),
    onSuccess: (data, variables) => {
      if (data.ok) {
        setSignupData(variables);
        setStep('verify');
        toast({
          title: 'Account created!',
          description: 'Please check your email for the verification code.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create account.',
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

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyFormData) => {
      if (!signupData?.email) {
        throw new Error('Email not found. Please return to signup form.');
      }
      return apiRequest('/api/auth/verify-code', { 
        method: 'POST', 
        body: { email: signupData.email, code: data.code } 
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: 'Welcome!',
          description: 'Your account has been verified and you are now signed in.',
        });
        setLocation('/account/profile');
      } else {
        toast({
          title: 'Invalid code',
          description: data.error || 'The code you entered is invalid or expired.',
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

  const onSignupSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const onVerifySubmit = (data: VerifyFormData) => {
    verifyMutation.mutate(data);
  };

  if (step === 'signup') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>
                Join our community to connect with local event organizers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      data-testid="input-firstname"
                      {...signupForm.register('firstName')}
                    />
                    {signupForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      data-testid="input-lastname"
                      {...signupForm.register('lastName')}
                    />
                    {signupForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    data-testid="input-email"
                    {...signupForm.register('email')}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    placeholder="Vancouver, BC"
                    data-testid="input-location"
                    {...signupForm.register('location')}
                  />
                  {signupForm.formState.errors.location && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.location.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    data-testid="input-website"
                    {...signupForm.register('website')}
                  />
                  {signupForm.formState.errors.website && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.website.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                    data-testid="input-bio"
                    {...signupForm.register('bio')}
                  />
                  {signupForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={signupMutation.isPending}
                  data-testid="button-signup"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Create account
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => setLocation('/account/signin')}
                    className="text-primary hover:underline"
                    data-testid="link-signin"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{signupData?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  data-testid="input-code"
                  {...verifyForm.register('code')}
                  className="text-center text-2xl tracking-widest font-mono"
                />
                {verifyForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {verifyForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyMutation.isPending}
                data-testid="button-verify"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Create Account'
                )}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button
                onClick={() => setStep('signup')}
                className="text-sm text-muted-foreground hover:text-primary"
                data-testid="link-back"
              >
                ← Back to signup form
              </button>
              
              <div className="text-sm text-muted-foreground">
                Didn't receive the code?{' '}
                <button
                  onClick={() => {
                    if (signupData) {
                      signupMutation.mutate(signupData);
                    }
                  }}
                  className="text-primary hover:underline"
                  disabled={signupMutation.isPending}
                  data-testid="link-resend"
                >
                  Resend
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}