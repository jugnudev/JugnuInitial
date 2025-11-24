import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, ArrowLeft, Briefcase, CheckCircle, Building2, Sparkles, Shield, TrendingUp, Users, DollarSign, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

const businessSignupSchema = z.object({
  // Personal Information
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  
  // Business Information (Required)
  businessName: z.string().min(1, 'Business name is required'),
  businessEmail: z.string().email('Business email is required'),
  businessDescription: z.string().min(10, 'Please provide a detailed description (min 10 characters)'),
  businessType: z.enum(['event_organizer', 'venue', 'artist', 'promoter', 'other'], {
    required_error: 'Please select a business type'
  }),
  
  // Business Information (Optional)
  businessWebsite: z.string()
    .transform((val) => {
      if (!val || val === '') return '';
      // If user didn't include protocol, add https://
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url('Must be a valid URL').optional().or(z.literal(''))),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  yearsExperience: z.number().min(0).max(50).optional().or(z.nan().transform(() => undefined)),
  sampleEvents: z.string().max(5000).optional(),
  
  // Social Media (Optional)
  instagramHandle: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric')
});

type BusinessSignupFormData = z.infer<typeof businessSignupSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export function BusinessSignupPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'signup' | 'verify' | 'success'>('signup');
  const [signupData, setSignupData] = useState<BusinessSignupFormData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<BusinessSignupFormData>({
    resolver: zodResolver(businessSignupSchema),
    defaultValues: { 
      email: '',
      firstName: '',
      lastName: '',
      businessName: '',
      businessEmail: '',
      businessDescription: '',
      businessWebsite: 'https://',
      businessPhone: '',
      businessAddress: '',
      sampleEvents: '',
      instagramHandle: '',
      facebookUrl: '',
      twitterHandle: '',
      linkedinUrl: '',
    }
  });

  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: BusinessSignupFormData) => {
      const payload = {
        ...data,
        socialMediaHandles: {
          instagram: data.instagramHandle || undefined,
          facebook: data.facebookUrl || undefined,
          twitter: data.twitterHandle || undefined,
          linkedin: data.linkedinUrl || undefined,
        }
      };

      const response = await fetch('/api/auth/signup-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.ok) {
        setSignupData(variables);
        setUserId(data.userId);
        setStep('verify');
        toast({
          title: 'Business account created!',
          description: 'Please check your email for the verification code.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create business account.',
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
    mutationFn: async (data: VerifyFormData) => {
      if (!signupData?.email) {
        throw new Error('Email not found. Please return to signup form.');
      }
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email, code: data.code }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setStep('success');
      } else {
        toast({
          title: 'Verification failed',
          description: data.error || 'Invalid or expired code.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Verification failed.',
        variant: 'destructive',
      });
    }
  });

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Application Submitted Successfully!</h2>
                  <p className="text-muted-foreground mt-3 text-lg">
                    Your business account has been created and your organizer application is under review.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-6 text-left space-y-3">
                  <h3 className="font-semibold text-lg">What happens next?</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2">1.</span>
                      <span>Our team will review your application within 1-2 business days.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">2.</span>
                      <span>You'll receive an email notification once your application is approved.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">3.</span>
                      <span>After approval, you can start building and engaging your community!</span>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setLocation('/')}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-home"
                  >
                    Return Home
                  </Button>
                  <Button 
                    onClick={() => setLocation('/communities')}
                    className="flex-1"
                    data-testid="button-explore"
                  >
                    Explore Communities
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Verify Your Email
              </CardTitle>
              <CardDescription>
                We sent a 6-digit code to {signupData?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={verifyForm.handleSubmit((data) => verifyMutation.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    data-testid="input-code"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    {...verifyForm.register('code')}
                    className="text-center text-2xl tracking-widest"
                  />
                  {verifyForm.formState.errors.code && (
                    <p className="text-sm text-destructive">{verifyForm.formState.errors.code.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyMutation.isPending}
                  data-testid="button-verify"
                >
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Email
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('signup')}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Signup
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Value Proposition Banner */}
        <Card className="border-copper-500/30 bg-gradient-to-br from-copper-500/10 to-amber-500/5 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-copper-500/20 via-transparent to-transparent pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30 px-3 py-1">
                  <Shield className="w-4 h-4 mr-1.5 inline" />
                  $50/MONTH
                </Badge>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-copper-400" />
                  Full Platform Access
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  Join for just $50/month and keep 100% of your ticket revenue with <strong className="text-copper-400">zero commission</strong> — 
                  unlike competitors who charge 5-10% per ticket. Includes 2 monthly ad placement credits.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <Users className="w-5 h-5 text-copper-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white text-sm">Community Platform</div>
                  <div className="text-white/60 text-xs">Build & engage your members</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <DollarSign className="w-5 h-5 text-jade-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white text-sm">0% Commission</div>
                  <div className="text-white/60 text-xs">Keep 100% of ticket sales</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <TrendingUp className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white text-sm">Full Analytics</div>
                  <div className="text-white/60 text-xs">Track sales & engagement</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <Sparkles className="w-5 h-5 text-copper-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white text-sm">2 Ad Credits/Month</div>
                  <div className="text-white/60 text-xs">Promote on homepage or events</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.05] border border-white/10">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Info className="w-4 h-4 text-copper-400" />
                <span>Want to learn more about our pricing?</span>
              </div>
              <Link href="/pricing">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-copper-400 hover:text-copper-300 hover:bg-copper-500/10"
                  data-testid="button-view-pricing"
                >
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-copper-400" />
            <h1 className="text-3xl font-bold text-white">Create Your Business Account</h1>
          </div>
          <p className="text-white/60 text-lg">
            Join Jugnu's community platform and start building your audience
          </p>
        </div>

        <Card className="border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Complete this form to create your account and apply as an organizer in one step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => signupMutation.mutate(data))} className="space-y-8">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      data-testid="input-firstName"
                      placeholder="John"
                      {...form.register('firstName')}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      data-testid="input-lastName"
                      placeholder="Doe"
                      {...form.register('lastName')}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Your Email *</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    placeholder="john@example.com"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Business Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    data-testid="input-businessName"
                    placeholder="Acme Events Inc."
                    {...form.register('businessName')}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email *</Label>
                  <Input
                    id="businessEmail"
                    data-testid="input-businessEmail"
                    type="email"
                    placeholder="contact@acmeevents.com"
                    {...form.register('businessEmail')}
                  />
                  {form.formState.errors.businessEmail && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select
                    onValueChange={(value) => form.setValue('businessType', value as any)}
                    defaultValue={form.watch('businessType')}
                  >
                    <SelectTrigger id="businessType" data-testid="select-businessType">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event_organizer">Event Organizer</SelectItem>
                      <SelectItem value="venue">Venue</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="promoter">Promoter</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.businessType && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    data-testid="input-businessDescription"
                    placeholder="Tell us about your business, what types of events you organize, your target audience, etc."
                    rows={4}
                    {...form.register('businessDescription')}
                  />
                  {form.formState.errors.businessDescription && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessDescription.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Website</Label>
                    <Input
                      id="businessWebsite"
                      data-testid="input-businessWebsite"
                      type="text"
                      placeholder="acmeevents.com"
                      {...form.register('businessWebsite', {
                        onChange: (e) => {
                          const value = e.target.value;
                          // Ensure https:// is always present
                          if (!value.startsWith('https://') && !value.startsWith('http://')) {
                            if (value.length < 8) {
                              // If user tries to delete "https://", reset it
                              e.target.value = 'https://';
                            }
                          }
                        }
                      })}
                    />
                    {form.formState.errors.businessWebsite && (
                      <p className="text-sm text-destructive">{form.formState.errors.businessWebsite.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Phone Number</Label>
                    <Input
                      id="businessPhone"
                      data-testid="input-businessPhone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...form.register('businessPhone')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    data-testid="input-businessAddress"
                    placeholder="123 Main St, Vancouver, BC"
                    {...form.register('businessAddress')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    data-testid="input-yearsExperience"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="5"
                    {...form.register('yearsExperience', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleEvents">Sample Events (Optional)</Label>
                  <Textarea
                    id="sampleEvents"
                    data-testid="input-sampleEvents"
                    placeholder="List some events you've organized or plan to organize..."
                    rows={3}
                    {...form.register('sampleEvents')}
                  />
                </div>
              </div>

              {/* Social Media Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Social Media (Optional)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagramHandle">Instagram</Label>
                    <Input
                      id="instagramHandle"
                      data-testid="input-instagramHandle"
                      placeholder="@yourbusiness"
                      {...form.register('instagramHandle')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook</Label>
                    <Input
                      id="facebookUrl"
                      data-testid="input-facebookUrl"
                      placeholder="facebook.com/yourbusiness"
                      {...form.register('facebookUrl')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterHandle">Twitter/X</Label>
                    <Input
                      id="twitterHandle"
                      data-testid="input-twitterHandle"
                      placeholder="@yourbusiness"
                      {...form.register('twitterHandle')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn</Label>
                    <Input
                      id="linkedinUrl"
                      data-testid="input-linkedinUrl"
                      placeholder="linkedin.com/company/yourbusiness"
                      {...form.register('linkedinUrl')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signupMutation.isPending}
                  size="lg"
                  data-testid="button-submit"
                >
                  {signupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {signupMutation.isPending ? 'Creating Account...' : 'Create Business Account'}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setLocation('/communities/signin')}
                    className="text-primary hover:underline"
                    data-testid="link-signin"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
