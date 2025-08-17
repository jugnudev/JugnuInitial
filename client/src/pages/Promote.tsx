import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Target, TrendingUp, Eye, MousePointer, Users, MapPin, Calendar, CheckCircle, Upload, ExternalLink, Mail, Plus, Minus, Zap, Star, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PRICING_CONFIG, calculatePricing, formatCAD, type PackageType, type AddOnType, type DurationType } from '@/lib/pricing';

// Sample data for analytics preview
const sampleData = [
  { date: '2025-01-07', impressions: 120, clicks: 8, ctr: 6.7 },
  { date: '2025-01-08', impressions: 145, clicks: 12, ctr: 8.3 },
  { date: '2025-01-09', impressions: 189, clicks: 15, ctr: 7.9 },
  { date: '2025-01-10', impressions: 203, clicks: 18, ctr: 8.9 },
  { date: '2025-01-11', impressions: 167, clicks: 14, ctr: 8.4 },
  { date: '2025-01-12', impressions: 234, clicks: 21, ctr: 9.0 },
  { date: '2025-01-13', impressions: 178, clicks: 16, ctr: 9.0 }
];

const FAQ_ITEMS = [
  {
    question: "How quickly can my campaign go live?",
    answer: "Most campaigns launch within 2-3 business days after creative approval. We'll confirm your dates and provide a timeline once we review your materials."
  },
  {
    question: "What creative formats do you accept?",
    answer: "We accept JPG/PNG images (min 1200px wide), and can work with Figma links or brand assets. Our team can also create simple designs for an additional fee."
  },
  {
    question: "Can I target specific demographics?",
    answer: "Our audience is primarily 18-35 year olds interested in South Asian culture in Metro Vancouver. All placements reach this core demographic automatically."
  },
  {
    question: "How do I track my campaign performance?",
    answer: "You'll receive a private analytics portal link with real-time metrics including impressions, clicks, CTR, and daily breakdowns. Reports are available 24/7."
  },
  {
    question: "What if I need to make changes during my 7-day week?",
    answer: "Minor copy changes can usually be accommodated within 24 hours. Creative changes may require campaign restart depending on timing."
  },
  {
    question: "Do you offer discounts for longer bookings?",
    answer: "Yes! Multi-week bookings (2+ weeks) receive 10% off. We also offer package deals for businesses planning multiple campaigns throughout the year."
  },
  {
    question: "What is the September launch promo?",
    answer: "For September 2025 only, your first 7-day booking is free! This applies to any weekly package - Events Spotlight, Homepage Feature, or Full Feature. Perfect timing to try Jugnu risk-free."
  },
  {
    question: "What are delivery guarantees?",
    answer: "For Full Feature packages, we guarantee minimum viewable impressions during your 7-day week. If we deliver less than promised, we continue running your campaign at no additional cost until targets are met."
  },
  {
    question: "Can I book the same dates as another sponsor?",
    answer: "No, we enforce one sponsor per placement per day to maintain exclusivity and maximize your visibility. This prevents dilution and ensures you get the full attention of our audience."
  }
];

export default function Promote() {
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationType, setDurationType] = useState<DurationType>('weekly');
  const [weekDuration, setWeekDuration] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnType[]>([]);
  
  // Creative validation state
  const [creatives, setCreatives] = useState({
    desktop: null as File | null,
    mobile: null as File | null
  });
  const [creativeValidation, setCreativeValidation] = useState({
    desktop: { valid: false, issues: [] as string[], dimensions: null as {width: number, height: number} | null },
    mobile: { valid: false, issues: [] as string[], dimensions: null as {width: number, height: number} | null }
  });
  
  // Calculate current pricing
  const currentPricing = selectedPackage ? calculatePricing(
    selectedPackage,
    durationType,
    weekDuration,
    selectedAddOns
  ) : null;
  
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    instagram: '',
    website: '',
    desired_dates: '',
    budget_range: '',
    placements: [] as string[],
    objective: '',
    creative_links: '',
    comments: '',
    // New pricing fields
    duration_type: 'weekly' as DurationType,
    week_duration: 1,
    selected_add_ons: [] as AddOnType[]
  });

  // Honeypot and latency check for spam prevention
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime] = useState(Date.now());
  const [isPrefilled, setIsPrefilled] = useState(false);

  // Handle URL parameters for prefilled forms
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillData: any = {};
    let hasParams = false;

    // Extract parameters that match form fields
    const paramFields = [
      'business_name', 'campaign_name', 'headline', 'subline', 'cta_text',
      'website_url', 'placements', 'campaign_objectives', 'priority'
    ];

    paramFields.forEach(field => {
      const value = urlParams.get(field);
      if (value) {
        hasParams = true;
        if (field === 'placements' || field === 'campaign_objectives') {
          prefillData[field] = value.split(',').filter(Boolean);
        } else if (field === 'website_url') {
          prefillData['website'] = value;
        } else if (field === 'campaign_name') {
          // Use campaign name for reference but don't populate any specific field
          prefillData['comments'] = `Previous campaign: ${value}`;
        } else {
          prefillData[field] = value;
        }
      }
    });

    if (hasParams) {
      setFormData(prev => ({
        ...prev,
        business_name: prefillData.business_name || prev.business_name,
        website: prefillData.website || prev.website,
        placements: prefillData.placements || prev.placements,
        comments: prefillData.comments || prev.comments
      }));
      setIsPrefilled(true);
      
      // Show success message
      toast({
        title: "Form prefilled",
        description: "Your previous campaign settings have been loaded to save you time.",
      });
    }
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Creative validation requirements
  const CREATIVE_REQUIREMENTS = {
    desktop: {
      minWidth: 1600,
      minHeight: 400,
      aspectRatio: { min: 3.5, max: 4.5 }, // ~4:1 ratio with tolerance
      formats: ['image/jpeg', 'image/png', 'image/webp']
    },
    mobile: {
      minWidth: 1080,
      minHeight: 1080,
      aspectRatio: { min: 0.9, max: 1.1 }, // ~1:1 ratio with tolerance
      formats: ['image/jpeg', 'image/png', 'image/webp']
    }
  };

  const validateCreative = async (file: File, type: 'desktop' | 'mobile') => {
    const requirements = CREATIVE_REQUIREMENTS[type];
    const issues: string[] = [];
    
    // Check file format
    if (!requirements.formats.includes(file.type)) {
      issues.push(`Format must be JPG, PNG, or WebP (got ${file.type.split('/')[1]})`);
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      issues.push('File size must be under 10MB');
    }
    
    // Check image dimensions
    const dimensions = await getImageDimensions(file);
    if (dimensions) {
      if (dimensions.width < requirements.minWidth) {
        issues.push(`Width must be at least ${requirements.minWidth}px (got ${dimensions.width}px)`);
      }
      if (dimensions.height < requirements.minHeight) {
        issues.push(`Height must be at least ${requirements.minHeight}px (got ${dimensions.height}px)`);
      }
      
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < requirements.aspectRatio.min || aspectRatio > requirements.aspectRatio.max) {
        const idealRatio = type === 'desktop' ? '4:1' : '1:1';
        issues.push(`Aspect ratio should be approximately ${idealRatio} (got ${aspectRatio.toFixed(2)}:1)`);
      }
    } else {
      issues.push('Could not read image dimensions');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      dimensions
    };
  };

  const getImageDimensions = (file: File): Promise<{width: number, height: number} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCreativeUpload = async (file: File, type: 'desktop' | 'mobile') => {
    setCreatives(prev => ({ ...prev, [type]: file }));
    
    const validation = await validateCreative(file, type);
    setCreativeValidation(prev => ({
      ...prev,
      [type]: validation
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Spam prevention
    if (honeypot || Date.now() - formStartTime < 3000) {
      console.warn('Spam submission detected');
      return;
    }

    // Creative validation - check if creatives are uploaded and valid for placement types that need them
    const creativesRequired = formData.placements.some(p => ['events_spotlight', 'homepage_feature'].includes(p)) || 
                             ['events_spotlight', 'homepage_feature'].includes(selectedPackage || '');
    
    if (creativesRequired) {
      if (!creatives.desktop || !creatives.mobile) {
        toast({
          title: "Creative Assets Required",
          description: "Please upload both desktop and mobile creatives for your selected placements.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      if (!creativeValidation.desktop.valid || !creativeValidation.mobile.valid) {
        const issues = [
          ...(!creativeValidation.desktop.valid ? creativeValidation.desktop.issues.map(i => `Desktop: ${i}`) : []),
          ...(!creativeValidation.mobile.valid ? creativeValidation.mobile.issues.map(i => `Mobile: ${i}`) : [])
        ];
        
        toast({
          title: "Creative Validation Failed",
          description: `Please fix: ${issues.slice(0, 2).join('. ')}${issues.length > 2 ? '...' : ''}`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/spotlight/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          selected_package: selectedPackage,
          duration_type: durationType,
          week_duration: weekDuration,
          selected_add_ons: selectedAddOns,
          pricing_breakdown: currentPricing,
          creative_validation: creativesRequired ? {
            desktop_valid: creativeValidation.desktop.valid,
            mobile_valid: creativeValidation.mobile.valid,
            desktop_dimensions: creativeValidation.desktop.dimensions,
            mobile_dimensions: creativeValidation.mobile.dimensions,
            desktop_filename: creatives.desktop?.name,
            mobile_filename: creatives.mobile?.name
          } : null
        })
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "Application submitted!",
          description: "We'll review your application and creatives, then get back to you within 24 hours.",
        });
        
        // Reset form
        setFormData({
          business_name: '',
          contact_name: '',
          email: '',
          instagram: '',
          website: '',
          desired_dates: '',
          budget_range: '',
          placements: [],
          objective: '',
          creative_links: '',
          comments: '',
          duration_type: 'weekly' as DurationType,
          week_duration: 1,
          selected_add_ons: [] as AddOnType[]
        });
        setSelectedPackage(null);
        setDurationType('weekly');
        setWeekDuration(1);
        setSelectedAddOns([]);
        
        // Reset creatives
        setCreatives({
          desktop: null,
          mobile: null
        });
        setCreativeValidation({
          desktop: { valid: false, issues: [], dimensions: null },
          mobile: { valid: false, issues: [], dimensions: null }
        });
      } else {
        throw new Error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* SEO Meta Tags */}
      <link rel="canonical" href="https://jugnu.events/promote" />
      <meta name="description" content="Promote your business to Vancouver's South Asian community. Reach passionate culture enthusiasts with premium sponsorship packages starting at CA$50/week. Events page placements, homepage heroes, and full feature campaigns available." />
      <meta name="keywords" content="Vancouver South Asian advertising, Metro Vancouver sponsorship, cultural events marketing, South Asian audience, Jugnu sponsorship packages, Vancouver event promotion" />
      
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Jugnu",
            "url": "https://jugnu.events",
            "logo": "https://jugnu.events/logo.svg",
            "description": "Promote your business to South Asian culture enthusiasts in Vancouver",
            "sameAs": ["https://instagram.com/thehouseofjugnu"],
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Vancouver",
              "addressRegion": "BC",
              "addressCountry": "CA"
            }
          })
        }}
      />

      {/* Product Schema - Spotlight Banner */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Spotlight Banner - Vancouver South Asian Audience",
            "description": "Prime inline placement on events page targeting South Asian culture enthusiasts in Metro Vancouver with comprehensive tracking",
            "brand": {
              "@type": "Brand",
              "name": "Jugnu"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "CAD",
              "price": "85",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "85",
                "priceCurrency": "CAD",
                "unitText": "per 7-day week"
              },
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "Jugnu"
              }
            },
            "audience": {
              "@type": "Audience",
              "geographicArea": {
                "@type": "Place",
                "name": "Metro Vancouver, BC"
              }
            }
          })
        }}
      />

      {/* Product Schema - Homepage Hero */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Homepage Hero - Vancouver Cultural Events",
            "description": "High-impact below-the-fold hero placement reaching South Asian audience in Vancouver with premium visibility",
            "brand": {
              "@type": "Brand",
              "name": "Jugnu"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "CAD",
              "price": "210",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "210",
                "priceCurrency": "CAD",
                "unitText": "per 7-day week"
              },
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "Jugnu"
              }
            },
            "audience": {
              "@type": "Audience",
              "geographicArea": {
                "@type": "Place",
                "name": "Metro Vancouver, BC"
              }
            }
          })
        }}
      />

      {/* Product Schema - Full Feature Campaign */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Full Feature Campaign - Vancouver South Asian Community",
            "description": "Complete campaign package with landing page and Instagram carousel targeting Vancouver's South Asian cultural community",
            "brand": {
              "@type": "Brand",
              "name": "Jugnu"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "CAD",
              "price": "499",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "499",
                "priceCurrency": "CAD",
                "unitText": "per 7-day week"
              },
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "Jugnu"
              }
            },
            "audience": {
              "@type": "Audience",
              "geographicArea": {
                "@type": "Place",
                "name": "Metro Vancouver, BC"
              }
            }
          })
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://jugnu.events"
              },
              {
                "@type": "ListItem", 
                "position": 2,
                "name": "Promote",
                "item": "https://jugnu.events/promote"
              }
            ]
          })
        }}
      />

      {/* Organization + Offers Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Jugnu",
            "description": "Vancouver's premier South Asian cultural events platform",
            "url": "https://jugnu.ca",
            "makesOffer": [
              {
                "@type": "Offer",
                "name": "Spotlight Banner",
                "description": "Premium banner placement on events page",
                "price": "50",
                "priceCurrency": "CAD",
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "price": "50",
                  "priceCurrency": "CAD",
                  "unitText": "per week"
                },
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer", 
                "name": "Homepage Hero",
                "description": "Large hero placement on homepage",
                "price": "175",
                "priceCurrency": "CAD",
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "price": "175", 
                  "priceCurrency": "CAD",
                  "unitText": "per week"
                },
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                "name": "Full Feature",
                "description": "Complete sponsorship package with multiple placements",
                "price": "300",
                "priceCurrency": "CAD", 
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "price": "300",
                  "priceCurrency": "CAD",
                  "unitText": "per week"
                },
                "availability": "https://schema.org/InStock"
              }
            ]
          })
        }}
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQ_ITEMS.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          })
        }}
      />

      {/* Prefilled Form Banner */}
      {isPrefilled && (
        <div className="bg-copper-500/20 border-b border-copper-500/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-3 text-copper-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Form prefilled with your previous campaign settings
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-copper-500/10 via-bg to-bg"></div>
        <div className="absolute inset-0 bg-gradient-radial from-copper-500/5 via-transparent to-transparent"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-fraunces text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-white">
                Promote with{' '}
                <span className="bg-gradient-to-r from-copper-500 to-copper-600 bg-clip-text text-transparent">
                  Jugnu
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
                Reach passionate South Asian culture enthusiasts across Metro Vancouver with premium, measurable placements.
              </p>

              <Button
                onClick={() => scrollToSection('packages')}
                size="lg"
                className="bg-copper-500 hover:bg-copper-600 text-black font-semibold px-8 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 group"
                data-testid="cta-request-spotlight"
              >
                Request a Spotlight Slot
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Band */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">2,500+</div>
              <div className="text-muted text-sm">Monthly Visitors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-copper-500 mb-2">18-35</div>
              <div className="text-muted text-sm">Core Demographics</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">Metro YVR</div>
              <div className="text-muted text-sm">Geographic Reach</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-copper-500 mb-2">Culture+</div>
              <div className="text-muted text-sm">South Asian Focus</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Jugnu Works for Vancouver Businesses
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Connect with Metro Vancouver's most engaged South Asian cultural community through strategic, measurable placements.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <Target className="w-12 h-12 text-copper-500 mb-6" />
                <h3 className="font-fraunces text-xl font-bold text-white mb-4">Targeted Audience</h3>
                <p className="text-muted">
                  18-35 year olds passionate about South Asian culture, events, and community experiences in Metro Vancouver.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <Zap className="w-12 h-12 text-copper-500 mb-6" />
                <h3 className="font-fraunces text-xl font-bold text-white mb-4">Premium Placements</h3>
                <p className="text-muted">
                  Strategic positioning with frequency capping and viewability tracking for maximum impact and user experience.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <Shield className="w-12 h-12 text-copper-500 mb-6" />
                <h3 className="font-fraunces text-xl font-bold text-white mb-4">Transparent Analytics</h3>
                <p className="text-muted">
                  Real-time dashboard with viewable impressions, click tracking, CTR analysis, and exportable performance reports.
                </p>
              </Card>
            </motion.div>
          </div>

          {/* Who We Partner With */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <h3 className="font-fraunces text-xl font-bold text-white mb-6">
              Who We Partner With
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-muted">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-copper-500 rounded-full"></div>
                <span>Restaurants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-copper-500 rounded-full"></div>
                <span>Event Promoters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-copper-500 rounded-full"></div>
                <span>Student Clubs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-copper-500 rounded-full"></div>
                <span>Cultural Organizations</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-20 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Vancouver South Asian Audience Sponsorship Packages
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
              Choose the Metro Vancouver placement that best fits your campaign goals and budget.
            </p>

            {/* Duration Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm font-medium ${durationType === 'daily' ? 'text-white' : 'text-muted'}`}>
                Daily
              </span>
              <Switch
                checked={durationType === 'weekly'}
                onCheckedChange={(checked) => setDurationType(checked ? 'weekly' : 'daily')}
                data-testid="pricing-mode-toggle"
              />
              <span className={`text-sm font-medium ${durationType === 'weekly' ? 'text-white' : 'text-muted'}`}>
                Weekly
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Spotlight Banner */}
            <motion.div
              id="spotlight-banner"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:border-copper-500/30 transition-all duration-300 relative group">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.earlyPartner.enabled && (
                  <div className="absolute -top-3 -right-3 z-20">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 text-xs shadow-lg">
                      <Star className="w-3 h-3 mr-1" />
                      20% off first 3 bookings
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30">
                    Events Page
                  </Badge>
                </div>
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">{PRICING_CONFIG.packages.events_spotlight.name}</h3>
                <p className="text-muted text-sm mb-4">{PRICING_CONFIG.packages.events_spotlight.description}</p>
                
                {/* September Promo Banner */}
                {PRICING_CONFIG.promos.septemberFreeWeek.isActive() && durationType === 'weekly' && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-green-400 text-sm font-medium">
                      {PRICING_CONFIG.promos.septemberFreeWeek.badge}
                    </div>
                  </div>
                )}

                {/* Size Specifications */}
                <div className="text-xs text-muted mb-4 bg-black/20 p-3 rounded-lg">
                  <div className="font-medium mb-1">Creative Specs:</div>
                  <div>Desktop: {PRICING_CONFIG.packages.events_spotlight.sizeSpecs.desktop}</div>
                  <div>Mobile: {PRICING_CONFIG.packages.events_spotlight.sizeSpecs.mobile}</div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(durationType === 'daily' ? PRICING_CONFIG.packages.events_spotlight.daily : PRICING_CONFIG.packages.events_spotlight.weekly)}
                  </span>
                  <span className="text-muted">/{durationType === 'daily' ? 'day' : '7-day week'}</span>
                  
                  {/* Weekly Savings Badge */}
                  {durationType === 'weekly' && (
                    <div className="mt-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        You save {Math.round(((PRICING_CONFIG.packages.events_spotlight.daily * 7 - PRICING_CONFIG.packages.events_spotlight.weekly) / (PRICING_CONFIG.packages.events_spotlight.daily * 7)) * 100)}% vs daily
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Package-specific features */}
                <ul className="space-y-3 mb-4 text-sm">
                  {PRICING_CONFIG.packages.events_spotlight.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Global perks section */}
                <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs font-semibold text-copper-400 mb-2">ALL PACKAGES INCLUDE:</div>
                  <ul className="space-y-2 text-xs">
                    {PRICING_CONFIG.packages.events_spotlight.globalPerks.map((perk, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-copper-500 flex-shrink-0" />
                        <span className="text-muted">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    setSelectedPackage('events_spotlight');
                    scrollToSection('calculator');
                  }}
                  className="w-full bg-white/10 hover:bg-copper-500 hover:text-black text-white border border-white/20 transition-all duration-200"
                  data-testid="select-spotlight-banner"
                >
                  {PRICING_CONFIG.packages.events_spotlight.cta}
                </Button>
              </Card>
            </motion.div>

            {/* Homepage Hero */}
            <motion.div
              id="homepage-hero"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-8 bg-white/5 border-copper-500/30 hover:border-copper-500/50 transition-all duration-300 relative group shadow-lg shadow-copper-500/10">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.earlyPartner.enabled && (
                  <div className="absolute -top-3 -right-3 z-20">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 text-xs shadow-lg">
                      <Star className="w-3 h-3 mr-1" />
                      20% off first 3 bookings
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <Badge className="bg-copper-500 text-black">
                    Most Popular
                  </Badge>
                </div>
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">{PRICING_CONFIG.packages.homepage_feature.name}</h3>
                <p className="text-muted text-sm mb-4">{PRICING_CONFIG.packages.homepage_feature.description}</p>
                
                {/* September Promo Banner */}
                {PRICING_CONFIG.promos.septemberFreeWeek.isActive() && durationType === 'weekly' && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-green-400 text-sm font-medium">
                      {PRICING_CONFIG.promos.septemberFreeWeek.badge}
                    </div>
                  </div>
                )}

                {/* Size Specifications */}
                <div className="text-xs text-muted mb-4 bg-black/20 p-3 rounded-lg">
                  <div className="font-medium mb-1">Creative Specs:</div>
                  <div>Desktop: {PRICING_CONFIG.packages.homepage_feature.sizeSpecs.desktop}</div>
                  <div>Mobile: {PRICING_CONFIG.packages.homepage_feature.sizeSpecs.mobile}</div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(durationType === 'daily' ? PRICING_CONFIG.packages.homepage_feature.daily : PRICING_CONFIG.packages.homepage_feature.weekly)}
                  </span>
                  <span className="text-muted">/{durationType === 'daily' ? 'day' : '7-day week'}</span>
                  
                  {/* Weekly Savings Badge */}
                  {durationType === 'weekly' && (
                    <div className="mt-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        You save {Math.round(((PRICING_CONFIG.packages.homepage_feature.daily * 7 - PRICING_CONFIG.packages.homepage_feature.weekly) / (PRICING_CONFIG.packages.homepage_feature.daily * 7)) * 100)}% vs daily
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Package-specific features */}
                <ul className="space-y-3 mb-4 text-sm">
                  {PRICING_CONFIG.packages.homepage_feature.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Global perks section */}
                <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs font-semibold text-copper-400 mb-2">ALL PACKAGES INCLUDE:</div>
                  <ul className="space-y-2 text-xs">
                    {PRICING_CONFIG.packages.homepage_feature.globalPerks.map((perk, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-copper-500 flex-shrink-0" />
                        <span className="text-muted">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    setSelectedPackage('homepage_feature');
                    scrollToSection('calculator');
                  }}
                  className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold transition-all duration-200"
                  data-testid="select-homepage-hero"
                >
                  {PRICING_CONFIG.packages.homepage_feature.cta}
                </Button>
              </Card>
            </motion.div>

            {/* Full Feature */}
            <motion.div
              id="full-feature"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:border-copper-500/30 transition-all duration-300 relative group">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.earlyPartner.enabled && (
                  <div className="absolute -top-3 -right-3 z-20">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 text-xs shadow-lg">
                      <Star className="w-3 h-3 mr-1" />
                      20% off first 3 bookings
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Premium
                  </Badge>
                </div>
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">{PRICING_CONFIG.packages.full_feature.name}</h3>
                <p className="text-muted text-sm mb-4">{PRICING_CONFIG.packages.full_feature.description}</p>
                
                {/* September Promo Banner */}
                {PRICING_CONFIG.promos.septemberFreeWeek.isActive() && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-green-400 text-sm font-medium">
                      {PRICING_CONFIG.promos.septemberFreeWeek.badge}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(PRICING_CONFIG.packages.full_feature.base)}
                  </span>
                  <span className="text-muted">/7-day week</span>
                </div>
                
                {/* Package-specific features */}
                <ul className="space-y-3 mb-4 text-sm">
                  {PRICING_CONFIG.packages.full_feature.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Global perks section */}
                <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs font-semibold text-copper-400 mb-2">ALL PACKAGES INCLUDE:</div>
                  <ul className="space-y-2 text-xs">
                    {PRICING_CONFIG.packages.full_feature.globalPerks.map((perk, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-copper-500 flex-shrink-0" />
                        <span className="text-muted">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    setSelectedPackage('full_feature');
                    scrollToSection('calculator');
                  }}
                  className="w-full bg-white/10 hover:bg-copper-500 hover:text-black text-white border border-white/20 transition-all duration-200"
                  data-testid="select-full-feature"
                >
                  {PRICING_CONFIG.packages.full_feature.cta}
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      {selectedPackage && (
        <section id="calculator" className="py-20 bg-white/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
                  Customize Your Vancouver Campaign
                </h2>
                <p className="text-muted text-lg">
                  Configure duration and add-ons for your Metro Vancouver South Asian audience campaign
                </p>
              </div>

              <Card className="p-8 bg-white/5 border-white/10">
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Configuration Panel */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-fraunces text-xl font-bold text-white mb-4">
                        Selected Package
                      </h3>
                      <div className="p-4 bg-copper-500/10 border border-copper-500/20 rounded-lg">
                        <div className="font-semibold text-copper-400">
                          {PRICING_CONFIG.packages[selectedPackage].name}
                        </div>
                        <div className="text-sm text-muted mt-1">
                          {PRICING_CONFIG.packages[selectedPackage].description}
                        </div>
                      </div>
                    </div>

                    {/* Duration Controls */}
                    <div>
                      <h4 className="font-semibold text-white mb-3">Campaign Duration</h4>
                      
                      {/* Duration Type Toggle */}
                      <div className="flex items-center gap-4 mb-4">
                        <span className={`text-sm font-medium ${durationType === 'daily' ? 'text-white' : 'text-muted'}`}>
                          Daily
                        </span>
                        <Switch
                          checked={durationType === 'weekly'}
                          onCheckedChange={(checked) => setDurationType(checked ? 'weekly' : 'daily')}
                          data-testid="duration-type-toggle"
                        />
                        <span className={`text-sm font-medium ${durationType === 'weekly' ? 'text-white' : 'text-muted'}`}>
                          Weekly
                        </span>
                      </div>

                      {/* Week Duration Selector */}
                      {durationType === 'weekly' && (
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-muted">Number of weeks</label>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWeekDuration(Math.max(1, weekDuration - 1))}
                              disabled={weekDuration <= 1}
                              data-testid="decrease-weeks"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-white font-semibold min-w-[2rem] text-center">
                              {weekDuration}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWeekDuration(weekDuration + 1)}
                              data-testid="increase-weeks"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          {weekDuration >= 2 && (
                            <div className="text-sm text-green-400 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Multi-week discount applies: {Math.round(PRICING_CONFIG.discounts.multiWeek.rate * 100)}% off
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add-ons Selection */}
                    <div>
                      <h4 className="font-semibold text-white mb-3">Add-ons</h4>
                      <div className="space-y-3">
                        {(Object.keys(PRICING_CONFIG.addOns) as AddOnType[]).map((addOnKey) => {
                          const addOn = PRICING_CONFIG.addOns[addOnKey];
                          const isSelected = selectedAddOns.includes(addOnKey);
                          
                          return (
                            <div
                              key={addOnKey}
                              className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-copper-500/30 transition-colors"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAddOns(selectedAddOns.filter(id => id !== addOnKey));
                                } else {
                                  setSelectedAddOns([...selectedAddOns, addOnKey]);
                                }
                              }}
                              data-testid={`addon-${addOnKey}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => {}} // Handled by parent click
                              />
                              <div className="flex-1">
                                <div className="font-medium text-white">{addOn.name}</div>
                                <div className="text-sm text-muted">{addOn.description}</div>
                              </div>
                              <div className="text-sm font-semibold text-copper-400">
                                +{formatCAD(addOn.price)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Summary Panel */}
                  <div className="space-y-6">
                    <h3 className="font-fraunces text-xl font-bold text-white">
                      Pricing Summary
                    </h3>
                    
                    {currentPricing && (
                      <Card className="p-6 bg-copper-500/10 border-copper-500/20">
                        <div className="space-y-4">
                          {/* Base Package */}
                          <div className="flex justify-between items-center">
                            <span className="text-muted">
                              {currentPricing.breakdown.package}
                            </span>
                            <span className="text-white font-medium">
                              {formatCAD(currentPricing.basePrice)}
                            </span>
                          </div>

                          {/* Add-ons */}
                          {currentPricing.breakdown.addOns.map((addOn, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-muted text-sm">+ {addOn.name}</span>
                              <span className="text-white font-medium">
                                {formatCAD(addOn.price)}
                              </span>
                            </div>
                          ))}

                          {/* Subtotal */}
                          <Separator className="bg-white/10" />
                          <div className="flex justify-between items-center">
                            <span className="text-muted">Subtotal</span>
                            <span className="text-white font-medium">
                              {formatCAD(currentPricing.subtotal)}
                            </span>
                          </div>

                          {/* Discounts */}
                          {currentPricing.breakdown.discounts.map((discount, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {discount.name}
                              </span>
                              <span className="text-green-400 font-medium">
                                -{formatCAD(discount.amount)}
                              </span>
                            </div>
                          ))}

                          {/* Total */}
                          <Separator className="bg-white/10" />
                          <div className="flex justify-between items-center text-lg">
                            <span className="font-semibold text-white">Total</span>
                            <span className="font-bold text-copper-400">
                              {formatCAD(currentPricing.total)}
                            </span>
                          </div>

                          {/* Savings */}
                          {currentPricing.savings > 0 && (
                            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="text-green-400 font-medium">
                                You save {formatCAD(currentPricing.savings)}!
                              </div>
                            </div>
                          )}

                          {/* Weekly Savings vs Daily */}
                          {durationType === 'weekly' && currentPricing.weeklySavingsPercent > 0 && (
                            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <div className="text-blue-400 font-medium">
                                Weekly saves {currentPricing.weeklySavingsPercent}% vs daily pricing
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    <Button
                      onClick={() => scrollToSection('apply')}
                      className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                      data-testid="proceed-to-application"
                    >
                      Continue to Application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Live Preview Module */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Preview Your Placement
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Upload or paste an image URL to see how your creative will look in our placements.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-white/5 border-white/10">
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">
                  Creative Preview (Image URL)
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/your-creative.jpg"
                  value={previewImage}
                  onChange={(e) => setPreviewImage(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  data-testid="preview-image-input"
                />
              </div>

              {previewImage && (
                <div className="space-y-8">
                  {/* Events Banner Preview */}
                  <div>
                    <h4 className="text-white font-medium mb-4">Events Page Banner Preview</h4>
                    <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                      <div className="relative bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl overflow-hidden h-32 group cursor-pointer">
                        <img
                          src={previewImage}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlCA0E0QTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QcmV2aWV3IEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
                        <Badge className="absolute top-3 left-3 bg-white/90 text-gray-900">
                          Sponsored
                        </Badge>
                        <div className="absolute bottom-3 right-3">
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                            Learn More
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Preview */}
                  <div>
                    <h4 className="text-white font-medium mb-4">Homepage Hero Preview</h4>
                    <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                      <div 
                        className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden min-h-80 group cursor-pointer"
                        style={{
                          backgroundImage: `url(${previewImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
                        <Badge className="absolute top-6 left-6 bg-white/90 text-gray-900">
                          Sponsored
                        </Badge>
                        <div className="absolute inset-0 flex flex-col justify-center px-8 max-w-2xl">
                          <div className="text-orange-400 font-medium text-sm mb-3">Your Brand</div>
                          <h3 className="text-white text-4xl font-bold leading-tight mb-4">
                            Your Headline Here
                          </h3>
                          <p className="text-white/90 text-lg leading-relaxed mb-6">
                            Your compelling subline describing your offer or event.
                          </p>
                          <Button className="self-start bg-orange-600 hover:bg-orange-700 text-white">
                            Your CTA
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Simple, transparent process from application to campaign launch.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Upload, title: "Apply", desc: "Submit your campaign details and creative assets through our form." },
              { icon: CheckCircle, title: "We Confirm", desc: "We review your materials and confirm dates, placement, and creative." },
              { icon: TrendingUp, title: "Go Live", desc: "Your campaign launches and starts reaching our engaged audience." },
              { icon: BarChart3, title: "Get Report", desc: "Access your private analytics portal with real-time performance data." }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-copper-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-copper-500" />
                </div>
                <h3 className="font-fraunces text-xl font-bold text-white mb-2">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-muted text-sm">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Teaser */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Analytics You Get
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Real-time performance tracking with detailed insights and exportable reports.
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <Card className="p-8 bg-white/5 border-white/10">
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                {/* Sample Chart - Impressions */}
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-copper-500" />
                    Daily Impressions
                  </h4>
                  <div className="h-48 bg-black/20 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sampleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="impressions" 
                          stroke="#c05a0e" 
                          fill="rgba(192, 90, 14, 0.2)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sample Chart - Clicks */}
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <MousePointer className="w-5 h-5 text-copper-500" />
                    Daily Clicks
                  </h4>
                  <div className="h-48 bg-black/20 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sampleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="clicks" 
                          stroke="#c05a0e" 
                          strokeWidth={3}
                          dot={{ fill: '#c05a0e', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Performance Badges */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Real-time Tracking
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export CSV
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 px-4 py-2">
                  <Users className="w-4 h-4 mr-2" />
                  Sponsor Portal Included
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Add-ons Strip */}
      <section className="py-16 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-white mb-4">
              Add-Ons & Discounts
            </h2>
            <p className="text-muted">
              Enhance your campaign with additional services and save on longer bookings.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <Plus className="w-8 h-8 text-copper-500 mx-auto mb-3" />
              <h4 className="font-medium text-white mb-2">Story Boost</h4>
              <p className="text-muted text-sm mb-3">Instagram story amplification</p>
              <Badge className="bg-copper-500/20 text-copper-400">+CA$25</Badge>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <Plus className="w-8 h-8 text-copper-500 mx-auto mb-3" />
              <h4 className="font-medium text-white mb-2">Mid-Run Repost</h4>
              <p className="text-muted text-sm mb-3">Additional social boost</p>
              <Badge className="bg-copper-500/20 text-copper-400">+CA$25</Badge>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <Plus className="w-8 h-8 text-copper-500 mx-auto mb-3" />
              <h4 className="font-medium text-white mb-2">Custom Campaign</h4>
              <p className="text-muted text-sm mb-3">Tailored multi-platform</p>
              <Badge className="bg-purple-500/20 text-purple-400">Quote</Badge>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <Minus className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h4 className="font-medium text-white mb-2">Multi-Week</h4>
              <p className="text-muted text-sm mb-3">Book 2+ weeks</p>
              <Badge className="bg-green-500/20 text-green-400">-10%</Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Apply for Sponsorship
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Tell us about your campaign and we'll get back to you within 24 hours.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <Card className="p-8 bg-white/5 border-white/10">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website_url"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Business Name *
                    </label>
                    <Input
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Your Company Name"
                      data-testid="input-business-name"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Contact Name *
                    </label>
                    <Input
                      required
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Your Full Name"
                      data-testid="input-contact-name"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="hello@company.com"
                      data-testid="input-email"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Instagram
                    </label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="@yourhandle"
                      data-testid="input-instagram"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Website
                  </label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="https://yourwebsite.com"
                    data-testid="input-website"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Desired Dates
                    </label>
                    <Input
                      value={formData.desired_dates}
                      onChange={(e) => setFormData({...formData, desired_dates: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="e.g. Feb 15-22, 2025"
                      data-testid="input-desired-dates"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Budget Range
                    </label>
                    <Select 
                      value={formData.budget_range} 
                      onValueChange={(value) => setFormData({...formData, budget_range: value})}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-budget-range">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$85-210">CA$85-210/7-day week</SelectItem>
                        <SelectItem value="$210-499">CA$210-499/7-day week</SelectItem>
                        <SelectItem value="$499">CA$499/Full Feature</SelectItem>
                        <SelectItem value="$500+">CA$500+/custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Interested Placements
                  </label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { id: 'events_spotlight', label: 'Events Spotlight Banner' },
                      { id: 'homepage_feature', label: 'Homepage Feature Banner' },
                      { id: 'full_feature', label: 'Full Feature' }
                    ].map((placement) => (
                      <Card 
                        key={placement.id}
                        className={`p-4 cursor-pointer transition-all ${
                          formData.placements.includes(placement.id) || selectedPackage === placement.id
                            ? 'bg-copper-500/20 border-copper-500/50' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                        onClick={() => {
                          const placements = formData.placements.includes(placement.id)
                            ? formData.placements.filter(p => p !== placement.id)
                            : [...formData.placements, placement.id];
                          setFormData({...formData, placements});
                        }}
                        data-testid={`placement-${placement.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            formData.placements.includes(placement.id) || selectedPackage === placement.id
                              ? 'bg-copper-500 border-copper-500' 
                              : 'border-white/30'
                          }`}>
                            {(formData.placements.includes(placement.id) || selectedPackage === placement.id) && (
                              <CheckCircle className="w-3 h-3 text-black" />
                            )}
                          </div>
                          <span className="text-white text-sm font-medium">{placement.label}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Campaign Objective
                  </label>
                  <Select 
                    value={formData.objective} 
                    onValueChange={(value) => setFormData({...formData, objective: value})}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-objective">
                      <SelectValue placeholder="Select primary objective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                      <SelectItem value="event_launch">Event Launch</SelectItem>
                      <SelectItem value="product_promotion">Product Promotion</SelectItem>
                      <SelectItem value="community_building">Community Building</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Creative Upload Section */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Creative Assets
                    </h3>
                    <p className="text-muted text-sm mb-6">
                      Upload your campaign creatives. We'll validate sizes and formats to ensure optimal display.
                    </p>
                  </div>

                  {/* Desktop Creative */}
                  <div className="space-y-3">
                    <label className="block text-white font-medium">
                      Desktop Creative *
                      <span className="text-muted text-sm font-normal ml-2">
                        (Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)
                      </span>
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                      creatives.desktop ? 
                        (creativeValidation.desktop.valid ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') :
                        'border-white/20 hover:border-white/40'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCreativeUpload(file, 'desktop');
                        }}
                        className="hidden"
                        id="desktop-creative"
                        data-testid="upload-desktop-creative"
                      />
                      
                      {!creatives.desktop ? (
                        <label htmlFor="desktop-creative" className="cursor-pointer flex flex-col items-center gap-3">
                          <Upload className="w-8 h-8 text-muted" />
                          <div className="text-center">
                            <div className="text-white font-medium">Upload Desktop Creative</div>
                            <div className="text-muted text-sm">Click to browse or drag & drop</div>
                          </div>
                        </label>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                creativeValidation.desktop.valid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-white font-medium">{creatives.desktop.name}</span>
                              {creativeValidation.desktop.valid && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCreatives(prev => ({ ...prev, desktop: null }));
                                setCreativeValidation(prev => ({ 
                                  ...prev, 
                                  desktop: { valid: false, issues: [], dimensions: null }
                                }));
                              }}
                              className="text-white border-white/20"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          {creativeValidation.desktop.dimensions && (
                            <div className="text-sm text-muted">
                              Dimensions: {creativeValidation.desktop.dimensions.width}×{creativeValidation.desktop.dimensions.height}px
                            </div>
                          )}
                          
                          {creativeValidation.desktop.issues.length > 0 && (
                            <div className="space-y-1">
                              {creativeValidation.desktop.issues.map((issue, index) => (
                                <div key={index} className="text-red-400 text-sm flex items-center gap-2">
                                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                  {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Creative */}
                  <div className="space-y-3">
                    <label className="block text-white font-medium">
                      Mobile Creative *
                      <span className="text-muted text-sm font-normal ml-2">
                        (Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)
                      </span>
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                      creatives.mobile ? 
                        (creativeValidation.mobile.valid ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') :
                        'border-white/20 hover:border-white/40'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCreativeUpload(file, 'mobile');
                        }}
                        className="hidden"
                        id="mobile-creative"
                        data-testid="upload-mobile-creative"
                      />
                      
                      {!creatives.mobile ? (
                        <label htmlFor="mobile-creative" className="cursor-pointer flex flex-col items-center gap-3">
                          <Upload className="w-8 h-8 text-muted" />
                          <div className="text-center">
                            <div className="text-white font-medium">Upload Mobile Creative</div>
                            <div className="text-muted text-sm">Click to browse or drag & drop</div>
                          </div>
                        </label>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                creativeValidation.mobile.valid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-white font-medium">{creatives.mobile.name}</span>
                              {creativeValidation.mobile.valid && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCreatives(prev => ({ ...prev, mobile: null }));
                                setCreativeValidation(prev => ({ 
                                  ...prev, 
                                  mobile: { valid: false, issues: [], dimensions: null }
                                }));
                              }}
                              className="text-white border-white/20"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          {creativeValidation.mobile.dimensions && (
                            <div className="text-sm text-muted">
                              Dimensions: {creativeValidation.mobile.dimensions.width}×{creativeValidation.mobile.dimensions.height}px
                            </div>
                          )}
                          
                          {creativeValidation.mobile.issues.length > 0 && (
                            <div className="space-y-1">
                              {creativeValidation.mobile.issues.map((issue, index) => (
                                <div key={index} className="text-red-400 text-sm flex items-center gap-2">
                                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                  {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Creative Guidelines */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Creative Guidelines
                    </h4>
                    <ul className="space-y-2 text-sm text-muted">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        All banners automatically include a subtle "Sponsored" label for transparency
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        Avoid placing critical text near edges (safe margin: 40px)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        Use high contrast colors for better readability
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        Test designs on dark backgrounds (similar to site theme)
                      </li>
                    </ul>
                  </div>

                  {/* Fallback for existing links */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Additional Creative Links
                      <span className="text-muted text-sm font-normal ml-2">(Optional - Figma, brand assets, etc.)</span>
                    </label>
                    <Textarea
                      value={formData.creative_links}
                      onChange={(e) => setFormData({...formData, creative_links: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Share links to Figma files, brand guidelines, or additional assets..."
                      rows={2}
                      data-testid="textarea-creative-links"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Additional Comments
                  </label>
                  <Textarea
                    value={formData.comments}
                    onChange={(e) => setFormData({...formData, comments: e.target.value})}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Tell us more about your campaign goals, special requirements, or questions..."
                    rows={4}
                    data-testid="textarea-comments"
                  />
                </div>

                {/* Creative Validation Summary */}
                {(formData.placements.some(p => ['events_spotlight', 'homepage_feature'].includes(p)) || 
                  ['events_spotlight', 'homepage_feature'].includes(selectedPackage || '')) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Creative Validation Status
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          creatives.desktop && creativeValidation.desktop.valid ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-muted">
                          Desktop Creative: {creatives.desktop ? 
                            (creativeValidation.desktop.valid ? 'Ready ✓' : 'Issues found') : 
                            'Required'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          creatives.mobile && creativeValidation.mobile.valid ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-muted">
                          Mobile Creative: {creatives.mobile ? 
                            (creativeValidation.mobile.valid ? 'Ready ✓' : 'Issues found') : 
                            'Required'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-copper-500 hover:bg-copper-600 text-black font-semibold px-8 py-3 flex-1"
                    data-testid="button-submit-application"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = 'mailto:hello@jugnu.events?subject=Sponsorship Inquiry'}
                    className="border-white/20 text-white hover:bg-white/10 px-8 py-3"
                    data-testid="button-email-direct"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Email Us
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Everything you need to know about sponsoring with Jugnu.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-white/5 border border-white/10 rounded-xl px-6 data-[state=open]:bg-white/10"
                >
                  <AccordionTrigger className="text-white hover:no-underline py-6">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted pb-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Connect with Vancouver's South Asian Community?
            </h2>
            <p className="text-muted text-lg mb-8">
              Join brands that trust Jugnu to reach an engaged, culturally-focused audience through premium placements and transparent analytics.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => scrollToSection('apply')}
                size="lg"
                className="bg-copper-500 hover:bg-copper-600 text-black font-semibold px-8 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 group"
                data-testid="cta-final-apply"
              >
                Request a Spotlight Slot
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button
                onClick={() => window.location.href = 'mailto:hello@jugnu.events?subject=Sponsorship Inquiry'}
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-2xl transition-all duration-200"
                data-testid="cta-final-email"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Us Directly
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}