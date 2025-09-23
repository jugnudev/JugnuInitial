import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric')
});

type SigninFormData = z.infer<typeof signinSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export function CommunitiesSigninPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
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
                  <Mail className="w-8 h-8 text-muted-foreground" />
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

  const emailForm = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: '' }
  });

  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' }
  });

  const signinMutation = useMutation({
    mutationFn: (data: SigninFormData) => 
      apiRequest('/api/account/signin', { method: 'POST', body: data }),
    onSuccess: (data) => {
      if (data.ok) {
        setEmail(emailForm.getValues('email'));
        setStep('verify');
        toast({
          title: 'Code sent!',
          description: 'Please check your email for the login code.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send login code.',
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
      if (!email) {
        throw new Error('Email not found. Please return to sign-in form.');
      }
      return apiRequest('/api/account/verify-code', { 
        method: 'POST', 
        body: { email, code: data.code } 
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: 'Welcome!',
          description: 'You have been signed in successfully.',
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

  const onEmailSubmit = (data: SigninFormData) => {
    signinMutation.mutate(data);
  };

  const onVerifySubmit = (data: VerifyFormData) => {
    verifyMutation.mutate(data);
  };

  if (step === 'email') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Enter your email address to receive a login code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    data-testid="input-email"
                    {...emailForm.register('email')}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={signinMutation.isPending}
                  data-testid="button-signin"
                >
                  {signinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send login code
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setLocation('/account/signup')}
                    className="text-primary hover:underline"
                    data-testid="link-signup"
                  >
                    Sign up
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
            <CardTitle className="text-2xl">Enter verification code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{email}</strong>
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
                  'Verify & Sign In'
                )}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button
                onClick={() => setStep('email')}
                className="text-sm text-muted-foreground hover:text-primary"
                data-testid="link-back"
              >
                ← Back to email entry
              </button>
              
              <div className="text-sm text-muted-foreground">
                Didn't receive the code?{' '}
                <button
                  onClick={() => {
                    setStep('email');
                    emailForm.setValue('email', email);
                  }}
                  className="text-primary hover:underline"
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