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
import { PRICING_CONFIG, calculatePricing, formatCAD, type PackageType, type AddOnType } from '@/lib/pricing';

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
    question: "What if I need to make changes during my campaign?",
    answer: "Minor copy changes can usually be accommodated within 24 hours. Creative changes may require campaign restart depending on timing."
  },
  {
    question: "Do you offer discounts for longer campaigns?",
    answer: "Yes! Multi-week bookings receive 10% off. We also offer package deals for businesses planning multiple campaigns throughout the year."
  }
];

export default function Promote() {
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState<'daily' | 'weekly'>('weekly');
  const [weekDuration, setWeekDuration] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnType[]>([]);
  
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
    duration: 'weekly' as 'daily' | 'weekly',
    weeks: 1,
    add_ons: [] as string[]
  });

  // Honeypot and latency check for spam prevention
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime] = useState(Date.now());

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Spam prevention
    if (honeypot || Date.now() - formStartTime < 3000) {
      console.warn('Spam submission detected');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/spotlight/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "Application submitted!",
          description: "We'll review your request and get back to you within 24 hours.",
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
          comments: ''
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
            "offers": [
              {
                "@type": "Offer",
                "name": "Spotlight Banner",
                "description": "Prime inline placement on events page with tracking",
                "price": "50",
                "priceCurrency": "CAD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "50",
                  "priceCurrency": "CAD",
                  "unitText": "per week"
                }
              },
              {
                "@type": "Offer", 
                "name": "Homepage Hero",
                "description": "High-impact below-the-fold hero placement",
                "price": "150",
                "priceCurrency": "CAD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "150", 
                  "priceCurrency": "CAD",
                  "unitText": "per week"
                }
              },
              {
                "@type": "Offer",
                "name": "Full Feature Campaign",
                "description": "Landing page plus Instagram carousel promotion",
                "price": "300",
                "priceCurrency": "CAD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "300",
                  "priceCurrency": "CAD", 
                  "unitText": "per campaign"
                }
              }
            ]
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
              Why It Works
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Connect with Vancouver's most engaged cultural community through strategic, measurable placements.
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
              Sponsorship Packages
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
              Choose the placement that best fits your campaign goals and budget.
            </p>

            {/* Duration Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm font-medium ${pricingMode === 'daily' ? 'text-white' : 'text-muted'}`}>
                Daily
              </span>
              <Switch
                checked={pricingMode === 'weekly'}
                onCheckedChange={(checked) => setPricingMode(checked ? 'weekly' : 'daily')}
                data-testid="pricing-mode-toggle"
              />
              <span className={`text-sm font-medium ${pricingMode === 'weekly' ? 'text-white' : 'text-muted'}`}>
                Weekly
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Spotlight Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:border-copper-500/30 transition-all duration-300 relative group">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.early_partner.active && (
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
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">Spotlight Banner</h3>
                
                {/* Size Specifications */}
                <div className="text-xs text-muted mb-4 bg-black/20 p-3 rounded-lg">
                  <div className="font-medium mb-1">Creative Specs:</div>
                  <div>Desktop: {PRICING_CONFIG.packages.spotlight_banner.sizeSpecs.desktop}</div>
                  <div>Mobile: {PRICING_CONFIG.packages.spotlight_banner.sizeSpecs.mobile}</div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(pricingMode === 'daily' ? PRICING_CONFIG.packages.spotlight_banner.daily : PRICING_CONFIG.packages.spotlight_banner.weekly)}
                  </span>
                  <span className="text-muted">/{pricingMode}</span>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Prime inline placement after first row</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Desktop & mobile optimized</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Frequency capping (1×/day/user)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Click tracking & UTM tagging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Weekly performance report</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">2-3 day turnaround</span>
                  </li>
                </ul>

                <Button
                  onClick={() => {
                    setSelectedPackage('spotlight_banner');
                    scrollToSection('apply');
                  }}
                  className="w-full bg-white/10 hover:bg-copper-500 hover:text-black text-white border border-white/20 transition-all duration-200"
                  data-testid="select-spotlight-banner"
                >
                  Choose Spotlight Banner
                </Button>
              </Card>
            </motion.div>

            {/* Homepage Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-8 bg-white/5 border-copper-500/30 hover:border-copper-500/50 transition-all duration-300 relative group shadow-lg shadow-copper-500/10">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.early_partner.active && (
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
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">Homepage Hero</h3>
                
                {/* Size Specifications */}
                <div className="text-xs text-muted mb-4 bg-black/20 p-3 rounded-lg">
                  <div className="font-medium mb-1">Creative Specs:</div>
                  <div>Desktop: {PRICING_CONFIG.packages.homepage_hero.sizeSpecs.desktop}</div>
                  <div>Mobile: {PRICING_CONFIG.packages.homepage_hero.sizeSpecs.mobile}</div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(pricingMode === 'daily' ? PRICING_CONFIG.packages.homepage_hero.daily : PRICING_CONFIG.packages.homepage_hero.weekly)}
                  </span>
                  <span className="text-muted">/{pricingMode}</span>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">High-impact below-the-fold placement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">7-day campaign duration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Frequency capping (1×/day/user)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Custom headline/subline/CTA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Full impression & click tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Weekly performance report</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">2-3 day turnaround</span>
                  </li>
                </ul>

                <Button
                  onClick={() => {
                    setSelectedPackage('homepage_hero');
                    scrollToSection('apply');
                  }}
                  className="w-full bg-copper-500 hover:bg-copper-600 text-black font-semibold transition-all duration-200"
                  data-testid="select-homepage-hero"
                >
                  Choose Homepage Hero
                </Button>
              </Card>
            </motion.div>

            {/* Full Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 hover:border-copper-500/30 transition-all duration-300 relative group">
                {/* Early Partner Discount Pill */}
                {PRICING_CONFIG.discounts.early_partner.active && (
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
                <h3 className="font-fraunces text-2xl font-bold text-white mb-4">Full Feature</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCAD(PRICING_CONFIG.packages.full_feature.base)}
                  </span>
                  <span className="text-muted">/campaign</span>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Optional dedicated landing page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Instagram carousel (4-6 slides)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Link-in-bio for 7 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Cross-platform performance report</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">No frequency limits (premium)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">Custom creative development</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-copper-500 flex-shrink-0" />
                    <span className="text-muted">5-7 day turnaround</span>
                  </li>
                </ul>

                <Button
                  onClick={() => {
                    setSelectedPackage('full_feature');
                    scrollToSection('apply');
                  }}
                  className="w-full bg-white/10 hover:bg-copper-500 hover:text-black text-white border border-white/20 transition-all duration-200"
                  data-testid="select-full-feature"
                >
                  Choose Full Feature
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

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
                        <SelectItem value="$50-150">CA$50-150/week</SelectItem>
                        <SelectItem value="$150-300">CA$150-300/week</SelectItem>
                        <SelectItem value="$300-500">CA$300-500/campaign</SelectItem>
                        <SelectItem value="$500+">CA$500+/campaign</SelectItem>
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
                      { id: 'spotlight_banner', label: 'Spotlight Banner' },
                      { id: 'homepage_hero', label: 'Homepage Hero' },
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

                <div>
                  <label className="block text-white font-medium mb-2">
                    Creative Links
                  </label>
                  <Textarea
                    value={formData.creative_links}
                    onChange={(e) => setFormData({...formData, creative_links: e.target.value})}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Share links to your images, brand assets, or Figma files..."
                    rows={3}
                    data-testid="textarea-creative-links"
                  />
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