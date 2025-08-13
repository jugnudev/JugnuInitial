import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Star, Calendar, CheckCircle, Users, Target, Monitor, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const promoteFormSchema = z.object({
  business_name: z.string().min(2, 'Business name is required'),
  contact_name: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  instagram: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  preferred_dates: z.string().min(5, 'Please provide preferred dates'),
  objective: z.enum(['awareness', 'launch', 'event'], {
    required_error: 'Please select an objective'
  }),
  budget_range: z.enum(['under_1k', '1k_3k', '3k_5k', '5k_plus'], {
    required_error: 'Please select a budget range'
  }),
  placements: z.array(z.string()).min(1, 'Please select at least one placement'),
  creative_links: z.string().optional(),
  comments: z.string().optional()
});

type PromoteFormData = z.infer<typeof promoteFormSchema>;

const packages = [
  {
    id: 'events_banner',
    name: 'Spotlight Banner',
    description: 'Featured placement on Events page',
    price: 'From $500/week',
    features: [
      'Prime placement after first row of events',
      'Desktop and mobile optimized',
      'Click-through tracking',
      'Frequency capping (1x per user per day)'
    ],
    specs: [
      'Desktop: 1600×400px banner format',
      'Mobile: 1080×600px optimized',
      'Headline ≤ 60 characters',
      'Subline ≤ 90 characters',
      'CTA ≤ 18 characters'
    ],
    icon: Target,
    popular: false
  },
  {
    id: 'home_hero',
    name: 'Homepage Hero',
    description: 'Premium homepage takeover',
    price: 'From $1,500/week',
    features: [
      'Full homepage hero placement',
      'High-impact visual storytelling',
      'Premium brand positioning',
      'Maximum visibility and engagement'
    ],
    specs: [
      'Desktop: 1600×900px (safe area top 220px)',
      'Mobile: 1080×1350px (center-safe)',
      'Headline ≤ 60 characters',
      'Subline ≤ 90 characters',
      'CTA ≤ 18 characters'
    ],
    icon: Star,
    popular: true
  },
  {
    id: 'full_feature',
    name: 'Full Feature',
    description: 'Complete brand experience package',
    price: 'From $3,000/campaign',
    features: [
      'Homepage Hero placement',
      'Custom detail page (/choice)',
      'Instagram carousel content',
      'Multi-touch brand journey',
      'Extended engagement metrics'
    ],
    specs: [
      'All Homepage Hero specs',
      'Custom landing page design',
      'Instagram-ready carousel (1080×1080)',
      '4-6 slide storytelling format',
      'SEO optimized content'
    ],
    icon: Megaphone,
    popular: false
  }
];

const audienceStats = [
  { label: 'Monthly Visitors', value: '25K+', icon: Users },
  { label: 'South Asian Community', value: '85%', icon: Target },
  { label: 'Vancouver Metro', value: '92%', icon: Target },
  { label: 'Age 18-45', value: '78%', icon: Users }
];

export default function Promote() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<PromoteFormData>({
    resolver: zodResolver(promoteFormSchema),
    defaultValues: {
      placements: []
    }
  });

  const onSubmit = async (data: PromoteFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/spotlight/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "Application Submitted!",
          description: result.message,
        });
        form.reset();
        setShowForm(false);
        setSelectedPlacements([]);
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlacementChange = (placementId: string, checked: boolean) => {
    const current = form.getValues('placements') || [];
    const updated = checked 
      ? [...current, placementId]
      : current.filter(id => id !== placementId);
    
    form.setValue('placements', updated);
    setSelectedPlacements(updated);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mb-4"
              data-testid="back-button"
            >
              ← Back to Packages
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Spotlight Slot</h1>
            <p className="text-gray-600">Tell us about your business and campaign goals</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Business Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="business_name">Business Name *</Label>
                      <Input
                        id="business_name"
                        {...form.register('business_name')}
                        data-testid="input-business-name"
                      />
                      {form.formState.errors.business_name && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.business_name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contact_name">Contact Name *</Label>
                      <Input
                        id="contact_name"
                        {...form.register('contact_name')}
                        data-testid="input-contact-name"
                      />
                      {form.formState.errors.contact_name && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.contact_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register('email')}
                        data-testid="input-email"
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="instagram">Instagram Handle</Label>
                      <Input
                        id="instagram"
                        placeholder="@yourbusiness"
                        {...form.register('instagram')}
                        data-testid="input-instagram"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourbusiness.com"
                      {...form.register('website')}
                      data-testid="input-website"
                    />
                    {form.formState.errors.website && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.website.message}</p>
                    )}
                  </div>
                </div>

                {/* Campaign Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Campaign Details</h3>
                  
                  <div>
                    <Label htmlFor="preferred_dates">Preferred Dates *</Label>
                    <Input
                      id="preferred_dates"
                      placeholder="e.g., First week of March 2024, or March 1-7, 2024"
                      {...form.register('preferred_dates')}
                      data-testid="input-preferred-dates"
                    />
                    {form.formState.errors.preferred_dates && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.preferred_dates.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Campaign Objective *</Label>
                      <Select onValueChange={(value: any) => form.setValue('objective', value)}>
                        <SelectTrigger data-testid="select-objective">
                          <SelectValue placeholder="Select objective" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="awareness">Brand Awareness</SelectItem>
                          <SelectItem value="launch">Product/Service Launch</SelectItem>
                          <SelectItem value="event">Event Promotion</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.objective && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.objective.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Budget Range *</Label>
                      <Select onValueChange={(value: any) => form.setValue('budget_range', value)}>
                        <SelectTrigger data-testid="select-budget">
                          <SelectValue placeholder="Select budget" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_1k">Under $1,000</SelectItem>
                          <SelectItem value="1k_3k">$1,000 - $3,000</SelectItem>
                          <SelectItem value="3k_5k">$3,000 - $5,000</SelectItem>
                          <SelectItem value="5k_plus">$5,000+</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.budget_range && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.budget_range.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Placement Selection */}
                  <div>
                    <Label>Interested Placements *</Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={pkg.id}
                            checked={selectedPlacements.includes(pkg.id)}
                            onCheckedChange={(checked) => handlePlacementChange(pkg.id, !!checked)}
                            data-testid={`checkbox-${pkg.id}`}
                          />
                          <div className="flex-1">
                            <Label htmlFor={pkg.id} className="font-medium cursor-pointer">
                              {pkg.name} - {pkg.price}
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {form.formState.errors.placements && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.placements.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creative_links">Creative Links (Optional)</Label>
                    <Textarea
                      id="creative_links"
                      placeholder="Share links to existing creative assets, brand guidelines, or inspiration"
                      {...form.register('creative_links')}
                      data-testid="textarea-creative-links"
                    />
                  </div>

                  <div>
                    <Label htmlFor="comments">Additional Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Any additional information about your campaign goals or requirements"
                      {...form.register('comments')}
                      data-testid="textarea-comments"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting}
                  data-testid="submit-button"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Promote with Jugnu
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Reach Vancouver's vibrant South Asian community with premium sponsored placements. 
            Connect with engaged audiences discovering events, culture, and experiences.
          </p>
        </div>

        {/* Audience Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {audienceStats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <stat.icon className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Packages */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Sponsorship Packages</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <Card key={pkg.id} className={`relative ${pkg.popular ? 'ring-2 ring-orange-200' : ''}`}>
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <pkg.icon className="w-6 h-6 text-orange-600" />
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  </div>
                  <CardDescription className="text-base">{pkg.description}</CardDescription>
                  <div className="text-2xl font-bold text-orange-600">{pkg.price}</div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">What you get:</h4>
                      <ul className="space-y-2">
                        {pkg.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Asset Specs:
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {pkg.specs.map((spec, index) => (
                          <li key={index}>• {spec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-orange-600 hover:bg-orange-700 px-8 py-4 text-lg"
            onClick={() => setShowForm(true)}
            data-testid="request-slot-button"
          >
            Request a Spotlight Slot
          </Button>
          <p className="text-gray-600 mt-4">
            We'll review your application and get back to you within 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}