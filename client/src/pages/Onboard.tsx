import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Upload, 
  ExternalLink, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Image as ImageIcon,
  Globe,
  Target,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface OnboardingData {
  businessName: string;
  contactName: string;
  email: string;
  packageCode: string;
  placements: string[];
  startDate: string;
  endDate: string;
  addOns: string[];
  creatives: {
    eventsDesktop?: string;
    eventsMobile?: string;
    homeDesktop?: string;
    homeMobile?: string;
  };
}

export default function Onboard() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    campaignTitle: '',
    headline: '',
    subline: '',
    ctaText: 'Learn More',
    clickUrl: ''
  });
  
  // Creative upload state
  const [creatives, setCreatives] = useState({
    eventsDesktop: null as File | null,
    eventsMobile: null as File | null,
    homeDesktop: null as File | null,
    homeMobile: null as File | null
  });
  
  // Load onboarding data
  useEffect(() => {
    if (!token) {
      setError('Invalid onboarding link');
      setIsLoading(false);
      return;
    }
    
    fetch(`/api/onboard/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setOnboardingData(data.prefill);
          // Set default campaign title
          setFormData(prev => ({
            ...prev,
            campaignTitle: `${data.prefill.businessName} - ${new Date(data.prefill.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
          }));
        } else {
          setError(data.error || 'Invalid or expired link');
        }
      })
      .catch(err => {
        console.error('Error loading onboarding data:', err);
        setError('Failed to load onboarding data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);
  
  // Handle file upload
  const handleFileUpload = (field: keyof typeof creatives, file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WebP image',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image under 10MB',
        variant: 'destructive'
      });
      return;
    }
    
    setCreatives(prev => ({ ...prev, [field]: file }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.campaignTitle || !formData.headline || !formData.ctaText || !formData.clickUrl) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('campaignTitle', formData.campaignTitle);
      formDataToSend.append('headline', formData.headline);
      formDataToSend.append('subline', formData.subline);
      formDataToSend.append('ctaText', formData.ctaText);
      formDataToSend.append('clickUrl', formData.clickUrl);
      
      // Add creative files if uploaded
      if (creatives.eventsDesktop) {
        formDataToSend.append('events_desktop', creatives.eventsDesktop);
      }
      if (creatives.eventsMobile) {
        formDataToSend.append('events_mobile', creatives.eventsMobile);
      }
      if (creatives.homeDesktop) {
        formDataToSend.append('home_desktop', creatives.homeDesktop);
      }
      if (creatives.homeMobile) {
        formDataToSend.append('home_mobile', creatives.homeMobile);
      }
      
      const response = await fetch(`/api/onboard/${token}`, {
        method: 'POST',
        body: formDataToSend
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setIsComplete(true);
        setPortalLink(result.portalLink);
        toast({
          title: 'Campaign created!',
          description: 'Your campaign has been successfully set up'
        });
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error submitting onboarding:', err);
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format placement name
  const formatPlacement = (placement: string) => {
    const placementMap: Record<string, string> = {
      'events_banner': 'Events Page Banner',
      'home_mid': 'Homepage Feature'
    };
    return placementMap[placement] || placement;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted">Loading onboarding...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !onboardingData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Onboarding Error</h1>
          <p className="text-muted mb-6">
            {error || 'This onboarding link is invalid or has expired.'}
          </p>
          <p className="text-sm text-muted mb-4">
            Please contact support for assistance:
          </p>
          <a 
            href={`mailto:${process.env.EMAIL_FROM_ADDRESS || 'relations@thehouseofjugnu.com'}`}
            className="text-primary hover:underline"
          >
            {process.env.EMAIL_FROM_ADDRESS || 'relations@thehouseofjugnu.com'}
          </a>
        </Card>
      </div>
    );
  }
  
  // Success state
  if (isComplete && portalLink) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Campaign Created!</h1>
            <p className="text-muted mb-6">
              Your campaign has been successfully set up and will be reviewed by our team.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted mb-2">Your Analytics Portal:</p>
              <a 
                href={portalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all flex items-center justify-center gap-1"
              >
                View Portal <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <Alert>
              <AlertDescription className="text-sm">
                Save this link! You'll use it to track your campaign performance in real-time.
              </AlertDescription>
            </Alert>
          </Card>
        </motion.div>
      </div>
    );
  }
  
  // Main onboarding form
  return (
    <div className="min-h-screen bg-bg">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Complete Your Campaign Setup</h1>
            <p className="text-muted">
              Welcome back, {onboardingData.contactName}! Let's finalize your campaign details.
            </p>
          </div>
          
          {/* Campaign Overview */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Campaign Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted mb-1">Business</p>
                <p className="font-medium">{onboardingData.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Package</p>
                <p className="font-medium capitalize">{onboardingData.packageCode.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Dates</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(onboardingData.startDate).toLocaleDateString()} - {new Date(onboardingData.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Placements</p>
                <div className="flex flex-wrap gap-2">
                  {onboardingData.placements.map(placement => (
                    <Badge key={placement} variant="secondary">
                      {formatPlacement(placement)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Campaign Form */}
          <form onSubmit={handleSubmit}>
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Campaign Details</h2>
              
              <div className="space-y-6">
                {/* Campaign Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Campaign Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.campaignTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaignTitle: e.target.value }))}
                    placeholder="e.g., Summer Sale 2025"
                    required
                  />
                  <p className="text-xs text-muted mt-1">Internal name for your campaign</p>
                </div>
                
                {/* Headline */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Headline <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.headline}
                    onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="e.g., Save 30% on Traditional Sweets"
                    maxLength={60}
                    required
                  />
                  <p className="text-xs text-muted mt-1">Main message viewers will see ({formData.headline.length}/60)</p>
                </div>
                
                {/* Subline */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subline <span className="text-muted text-xs">(Optional)</span>
                  </label>
                  <Textarea
                    value={formData.subline}
                    onChange={(e) => setFormData(prev => ({ ...prev, subline: e.target.value }))}
                    placeholder="e.g., Fresh mithai delivered daily across Metro Vancouver"
                    maxLength={120}
                    rows={2}
                  />
                  <p className="text-xs text-muted mt-1">Supporting message ({formData.subline.length}/120)</p>
                </div>
                
                {/* CTA Text */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Call-to-Action Text <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.ctaText}
                    onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="e.g., Shop Now, Learn More, Get Tickets"
                    maxLength={30}
                    required
                  />
                  <p className="text-xs text-muted mt-1">Button text ({formData.ctaText.length}/30)</p>
                </div>
                
                {/* Click URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Landing Page URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="url"
                    value={formData.clickUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, clickUrl: e.target.value }))}
                    placeholder="https://yourwebsite.com/landing-page"
                    required
                  />
                  <p className="text-xs text-muted mt-1">Where users go when they click (UTM parameters will be added automatically)</p>
                </div>
              </div>
            </Card>
            
            {/* Creative Assets */}
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Creative Assets</h2>
              
              <Alert className="mb-4">
                <AlertDescription>
                  Your existing creatives are shown below. Upload new files only if you want to replace them.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                {/* Events Banner Creatives */}
                {onboardingData.placements.includes('events_banner') && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Events Page Banner
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Desktop */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Desktop Creative (1600x400px)
                        </label>
                        {onboardingData.creatives.eventsDesktop && !creatives.eventsDesktop && (
                          <div className="mb-2 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted mb-1">Current:</p>
                            <img 
                              src={onboardingData.creatives.eventsDesktop} 
                              alt="Current desktop creative"
                              className="w-full h-20 object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('eventsDesktop', e.target.files[0])}
                            className="hidden"
                            id="events-desktop-upload"
                          />
                          <label htmlFor="events-desktop-upload" className="cursor-pointer">
                            {creatives.eventsDesktop ? (
                              <div>
                                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm">{creatives.eventsDesktop.name}</p>
                                <p className="text-xs text-muted">Click to change</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
                                <p className="text-sm">Click to upload replacement</p>
                                <p className="text-xs text-muted">JPG, PNG, or WebP</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      
                      {/* Mobile */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Mobile Creative (1080x1080px)
                        </label>
                        {onboardingData.creatives.eventsMobile && !creatives.eventsMobile && (
                          <div className="mb-2 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted mb-1">Current:</p>
                            <img 
                              src={onboardingData.creatives.eventsMobile} 
                              alt="Current mobile creative"
                              className="w-20 h-20 object-cover rounded mx-auto"
                            />
                          </div>
                        )}
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('eventsMobile', e.target.files[0])}
                            className="hidden"
                            id="events-mobile-upload"
                          />
                          <label htmlFor="events-mobile-upload" className="cursor-pointer">
                            {creatives.eventsMobile ? (
                              <div>
                                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm">{creatives.eventsMobile.name}</p>
                                <p className="text-xs text-muted">Click to change</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
                                <p className="text-sm">Click to upload replacement</p>
                                <p className="text-xs text-muted">JPG, PNG, or WebP</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Homepage Feature Creatives */}
                {onboardingData.placements.includes('home_mid') && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Homepage Feature
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Desktop */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Desktop Creative (1600x400px)
                        </label>
                        {onboardingData.creatives.homeDesktop && !creatives.homeDesktop && (
                          <div className="mb-2 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted mb-1">Current:</p>
                            <img 
                              src={onboardingData.creatives.homeDesktop} 
                              alt="Current desktop creative"
                              className="w-full h-20 object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('homeDesktop', e.target.files[0])}
                            className="hidden"
                            id="home-desktop-upload"
                          />
                          <label htmlFor="home-desktop-upload" className="cursor-pointer">
                            {creatives.homeDesktop ? (
                              <div>
                                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm">{creatives.homeDesktop.name}</p>
                                <p className="text-xs text-muted">Click to change</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
                                <p className="text-sm">Click to upload replacement</p>
                                <p className="text-xs text-muted">JPG, PNG, or WebP</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      
                      {/* Mobile */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Mobile Creative (1080x1080px)
                        </label>
                        {onboardingData.creatives.homeMobile && !creatives.homeMobile && (
                          <div className="mb-2 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted mb-1">Current:</p>
                            <img 
                              src={onboardingData.creatives.homeMobile} 
                              alt="Current mobile creative"
                              className="w-20 h-20 object-cover rounded mx-auto"
                            />
                          </div>
                        )}
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('homeMobile', e.target.files[0])}
                            className="hidden"
                            id="home-mobile-upload"
                          />
                          <label htmlFor="home-mobile-upload" className="cursor-pointer">
                            {creatives.homeMobile ? (
                              <div>
                                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm">{creatives.homeMobile.name}</p>
                                <p className="text-xs text-muted">Click to change</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
                                <p className="text-sm">Click to upload replacement</p>
                                <p className="text-xs text-muted">JPG, PNG, or WebP</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    Create Campaign
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}