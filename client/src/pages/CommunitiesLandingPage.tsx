import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, useScroll, useSpring, useTransform, useInView, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, MessageSquare, Heart, Plus, Lock, Globe, Crown, Star, Sparkles, Check, Zap, Calendar, Award, X, CheckCircle, Clock, TrendingUp, Shield, ChevronLeft, ChevronRight, Loader2, Camera } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";

interface Community {
  id: string;
  name: string;
  description: string;
  slug?: string;
  imageUrl?: string;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  memberCount?: number;
  postCount?: number;
}

interface User {
  id: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

interface UserMemberships {
  communities?: Community[];
}

interface CommunityAPIResponse {
  community?: Community;
  membership?: any;
  posts?: any[];
  members?: any[];
  canManage?: boolean;
}

// Enhanced animation configurations
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { 
    duration: 0.6, 
    ease: [0.25, 0.46, 0.45, 0.94] // Custom easing curve for natural feel
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { 
    duration: 0.8, 
    ease: [0.25, 0.46, 0.45, 0.94] 
  }
};

// Enhanced Button Component with Press Feedback
const MotionButton = motion(Button);
const buttonPress = {
  whileHover: { 
    scale: 1.02,
    transition: { 
      duration: 0.2,
      ease: "easeOut"
    }
  },
  whileTap: { 
    scale: 0.98,
    transition: { 
      duration: 0.1,
      ease: "easeInOut"
    }
  }
};

// Scroll-triggered animation hook
const useScrollAnimation = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      controls.start("animate");
    }
  }, [isInView, controls]);

  return [ref, controls] as const;
};

export default function CommunitiesLandingPage() {
  const [selectedTab, setSelectedTab] = useState<'my' | 'discover'>('my');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Enhanced wizard state management
  const [wizardStep, setWizardStep] = useState(1);
  const [communityForm, setCommunityForm] = useState({
    name: '',
    description: '',
    coverUrl: '',
    isPrivate: false,
    membershipPolicy: 'approval_required',
    category: '',
    tags: [],
    welcomeMessage: '',
    guidelines: '',
    allowDiscussions: true,
    allowEvents: true,
    allowResources: true,
    moderationLevel: 'moderate'
  });

  const totalSteps = 4;
  const { toast } = useToast();

  // Enhanced SEO Meta Tags for Communities conversion funnel
  useEffect(() => {
    // Store original title and meta tag values for restoration
    const originalTitle = document.title;
    const originalValues: { element: HTMLMetaElement; originalContent: string }[] = [];
    const createdMetas: HTMLMetaElement[] = [];
    
    // Set optimized page title
    document.title = "Communities - Jugnu | Create & Join Cultural Communities Vancouver";
    
    // Create or update meta tags for Communities page SEO
    const metaTags = [
      { name: 'description', content: 'Join Vancouver\'s premier cultural communities platform. Create communities, connect with like-minded members, and grow your cultural business with advanced member management tools.' },
      { name: 'keywords', content: 'communities Vancouver, cultural communities, South Asian community platform, business networking Vancouver, event organizer tools, community management, Vancouver cultural groups' },
      { property: 'og:title', content: 'Communities - Jugnu | Create & Join Cultural Communities' },
      { property: 'og:description', content: 'Build and grow cultural communities with member management, communication tools, and business features. Join Vancouver\'s leading cultural platform.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `https://thehouseofjugnu.com/communities` },
      { property: 'og:image', content: 'https://thehouseofjugnu.com/communities-og.jpg' },
      { property: 'og:locale', content: 'en_CA' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Communities - Jugnu | Cultural Community Platform' },
      { name: 'twitter:description', content: 'Create and manage cultural communities with advanced tools and features. Perfect for event organizers and cultural businesses.' },
      { name: 'twitter:image', content: 'https://thehouseofjugnu.com/communities-twitter.jpg' }
    ];
    
    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        // Create new meta tag
        meta = document.createElement('meta');
        if (name) meta.setAttribute('name', name);
        if (property) meta.setAttribute('property', property);
        document.head.appendChild(meta);
        createdMetas.push(meta);
      } else {
        // Store original content for restoration
        originalValues.push({ 
          element: meta, 
          originalContent: meta.getAttribute('content') || '' 
        });
      }
      meta.setAttribute('content', content);
    });

    // Add structured data for Communities platform
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Jugnu Communities",
      "applicationCategory": "CommunityApplication",
      "description": "Community platform for cultural organizations and event organizers in Vancouver",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "CAD",
        "description": "Free to join, premium features for organizers"
      },
      "featureList": [
        "Advanced Member Management",
        "Premium Communication Tools", 
        "Event Organization",
        "Business Networking",
        "Analytics & Insights",
        "Multi-channel Promotion"
      ],
      "provider": {
        "@type": "Organization",
        "name": "Jugnu",
        "url": "https://thehouseofjugnu.com"
      }
    };

    let jsonLdScript = document.querySelector('script[type="application/ld+json"][data-communities]') as HTMLScriptElement;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.setAttribute('data-communities', 'true');
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(structuredData);

    // Cleanup function - restore original state
    return () => {
      // Restore original title
      document.title = originalTitle;
      
      // Remove created meta tags
      createdMetas.forEach(meta => {
        if (meta.parentNode) {
          document.head.removeChild(meta);
        }
      });
      
      // Restore original meta tag values
      originalValues.forEach(({ element, originalContent }) => {
        if (element.parentNode) {
          element.setAttribute('content', originalContent);
        }
      });
      
      // Remove structured data
      if (jsonLdScript && jsonLdScript.parentNode) {
        document.head.removeChild(jsonLdScript);
      }
    };
  }, []);

  // Wizard navigation functions
  const nextStep = () => {
    if (wizardStep < totalSteps) {
      setWizardStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(prev => prev - 1);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCommunityForm({
      name: '',
      description: '',
      coverUrl: '',
      isPrivate: false,
      membershipPolicy: 'approval_required',
      category: '',
      tags: [],
      welcomeMessage: '',
      guidelines: '',
      allowDiscussions: true,
      allowEvents: true,
      allowResources: true,
      moderationLevel: 'moderate'
    });
  };

  // Step validation
  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return communityForm.name.trim().length >= 3;
      case 2:
        return true; // Settings are optional
      case 3:
        return true; // Advanced features are optional
      case 4:
        return communityForm.name.trim().length >= 3;
      default:
        return false;
    }
  };
  
  // Scroll progress for enhanced effects
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Get current user and organizer status
  const { data: authData, isLoading: userLoading } = useQuery<{ 
    user?: User; 
    organizer?: any; 
    organizerApplication?: any 
  }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const user = authData?.user;
  const organizer = authData?.organizer;
  const organizerApplication = authData?.organizerApplication;

  // Get user's communities if they're an approved organizer
  const { data: userCommunitiesData } = useQuery<{ communities: Community[], count: number }>({
    queryKey: ['/api/user/communities'],
    enabled: !!organizer,
    retry: false,
  });

  // Cover image upload mutation
  const uploadCoverImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);
      
      const response = await fetch('/api/communities/upload/cover', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload cover image');
      }
      
      const data = await response.json();
      return data.url;
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload cover image", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Create community mutation
  const createCommunityMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; coverUrl?: string; isPrivate?: boolean; membershipPolicy?: string }) => {
      const response = await apiRequest('POST', '/api/communities', data);
      if (!response.ok) {
        throw new Error('Failed to create community');
      }
      return response;
    },
    onSuccess: () => {
      toast({ title: "Community created successfully!" });
      setShowCreateDialog(false);
      resetWizard(); // Use proper wizard reset with all enhanced fields
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/communities'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle community creation form submission
  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityForm.name.trim()) {
      toast({ title: "Community name is required", variant: "destructive" });
      return;
    }
    createCommunityMutation.mutate(communityForm);
  };

  // Determine what to show based on tab and user status
  let communities: Community[] = [];

  if (user) {
    if (selectedTab === 'my') {
      // Show communities user owns (from the working API endpoint)
      communities = userCommunitiesData?.communities || [];
    } else if (selectedTab === 'discover') {
      // For now, show empty - in future could show public communities to join
      communities = [];
    }
  } else {
    // Show sign-in prompt for non-authenticated users
    communities = [];
  }

  // Show loading state while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Firefly glow background */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-full animate-pulse" />
        <div className="absolute bottom-32 right-32 w-48 h-48 bg-gradient-radial from-glow/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-copper-500/20 to-copper-600/20 border border-copper-500/30 mx-auto mb-8">
              {/* Firefly glow effect */}
              <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
              <Crown className="h-10 w-10 text-accent animate-pulse relative z-10" />
            </div>
            <h2 className="font-fraunces text-3xl font-bold text-text mb-6">
              Loading Your
              <span className="block bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                Premium Experience
              </span>
            </h2>
            <p className="text-muted leading-relaxed">
              Preparing your personalized community dashboard...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }
  
  // Show hero section differently based on authentication, but always show tabs
  const showAuthenticatedHero = !!user;
  
  if (false && !user) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Firefly atmosphere */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-radial from-copper-500/10 via-transparent to-transparent rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-radial from-glow/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-gradient-radial from-accent/10 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        
        {/* Simple Community Hero Section */}
        <div className="relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              {/* Community badge with firefly glow */}
              <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full border border-copper-500/30 bg-copper-500/10 text-accent text-sm font-medium mb-12 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full" />
                <Users className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Communities</span>
                <Sparkles className="h-4 w-4 relative z-10" />
              </div>
              
              <h1 className="font-fraunces text-5xl md:text-7xl font-bold mb-12 leading-tight">
                <span className="text-text">Join Vancouver's</span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">Cultural</span>
                  <motion.div
                    className="absolute -top-4 -right-4"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/50 via-transparent to-transparent rounded-full blur-sm" />
                      <Star className="h-10 w-10 text-glow fill-glow relative z-10" />
                    </div>
                  </motion.div>
                </span>
                <br />
                <span className="text-text">Communities</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted mb-16 max-w-4xl mx-auto leading-relaxed">
                Connect with like-minded people in Vancouver's vibrant cultural scene. Join communities,
                <br className="hidden md:block" />
                discover events, and build meaningful relationships - completely free.
              </p>

              {/* Simple Call to Action */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/account/signup">
                  <MotionButton 
                    size="lg"
                    className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300" 
                    data-testid="signup-button"
                    variants={buttonPress}
                    whileHover="whileHover"
                    whileTap="whileTap"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Join Communities - Free
                  </MotionButton>
                </Link>
                
                <Link href="/account/signin">
                  <MotionButton 
                    variant="outline" 
                    size="lg" 
                    className="border-accent/50 text-accent hover:bg-accent/10 hover:border-accent backdrop-blur-sm px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow" 
                    data-testid="signin-button"
                    variants={buttonPress}
                    whileHover="whileHover"
                    whileTap="whileTap"
                  >
                    <span className="font-medium">Already have an account? Sign In</span>
                  </MotionButton>
                </Link>
              </div>

              {/* Business organizer link */}
              <div className="mt-12 pt-8 border-t border-border/50">
                <p className="text-muted mb-4">
                  Want to create and manage your own community?
                </p>
                <Link href="/communities/business-signup">
                  <MotionButton 
                    variant="ghost" 
                    className="text-accent hover:bg-accent/10 transition-all duration-300" 
                    data-testid="business-signup-link"
                    variants={buttonPress}
                    whileHover="whileHover"
                    whileTap="whileTap"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Apply for Business Account
                  </MotionButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if user has approved business account
  const isApprovedOrganizer = organizer || (organizerApplication?.status === 'approved');
  const isPendingOrganizer = organizerApplication?.status === 'pending';
  const hasNoOrganizerApplication = !organizer && !organizerApplication;

  // Signed in users see community discovery OR community creation funnel
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient firefly atmosphere */}
      <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
      <div className="absolute top-32 left-20 w-48 h-48 bg-gradient-radial from-copper-500/15 via-transparent to-transparent rounded-full animate-pulse" />
      <div className="absolute bottom-40 right-32 w-64 h-64 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Community Creation Hero - Conversion Focused */}
      <div className="relative bg-gradient-to-br from-premium-surface to-premium-surface-elevated border-b border-premium-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-copper-500/10 via-accent/5 to-glow/10" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Status Badge */}
            <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full border border-accent/30 bg-copper-500/10 text-accent text-sm font-medium mb-12 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
              {isApprovedOrganizer ? (
                <>
                  <CheckCircle className="h-5 w-5 relative z-10 text-glow" />
                  <span className="relative z-10 font-semibold">Business Account Approved</span>
                  <Crown className="h-5 w-5 relative z-10" />
                </>
              ) : isPendingOrganizer ? (
                <>
                  <Clock className="h-5 w-5 relative z-10" />
                  <span className="relative z-10 font-semibold">Application Under Review</span>
                  <Sparkles className="h-5 w-5 relative z-10" />
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 relative z-10" />
                  <span className="relative z-10 font-semibold">Ready to Build Your Community?</span>
                  <Star className="h-5 w-5 relative z-10" />
                </>
              )}
            </div>
            
            {/* Dynamic Headline Based on Status */}
            <h1 className="font-fraunces text-4xl md:text-7xl font-bold mb-10 leading-tight">
              {isApprovedOrganizer ? (
                <>
                  <span className="text-text">Create Your</span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                    Community
                  </span>
                </>
              ) : isPendingOrganizer ? (
                <>
                  <span className="text-text">Your Application is</span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                    Under Review
                  </span>
                </>
              ) : (
                <>
                  <span className="text-text">Want to Create Your</span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                    Own Community?
                  </span>
                </>
              )}
            </h1>
            
            {/* Dynamic Value Proposition */}
            <p className="text-xl md:text-2xl mb-16 text-muted max-w-5xl mx-auto leading-relaxed">
              {isApprovedOrganizer ? (
                "Your business account is approved! Launch your community with advanced features, member management tools, and branding designed for authentic connections in Vancouver's cultural scene."
              ) : isPendingOrganizer ? (
                "Thank you for applying to become a community organizer! Our team is reviewing your application. You'll receive an email notification once approved, and then you can create your community."
              ) : (
                "Build an exclusive community for your audience with advanced member management, custom branding, and powerful engagement tools. Join Vancouver's leading cultural organizers in creating meaningful connections."
              )}
            </p>

            {/* Primary Call to Action */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {isApprovedOrganizer ? (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  disabled={createCommunityMutation.isPending}
                  size="lg"
                  className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-10 py-6 text-xl rounded-2xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                  data-testid="create-community-cta-button"
                >
                  <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Plus className="h-6 w-6 mr-3 relative z-10" />
                  <span className="relative z-10">
                    {createCommunityMutation.isPending ? 'Creating Your Community...' : 'Create Your Community Now'}
                  </span>
                </Button>
              ) : isPendingOrganizer ? (
                <div className="flex flex-col items-center gap-4">
                  <Button 
                    disabled
                    size="lg"
                    className="relative bg-gradient-to-r from-copper-500/50 to-accent/50 text-black/70 font-bold px-10 py-6 text-xl rounded-2xl cursor-not-allowed"
                  >
                    <Clock className="h-6 w-6 mr-3" />
                    Application Under Review
                  </Button>
                  <p className="text-sm text-muted">We'll notify you via email once your application is approved</p>
                </div>
              ) : (
                <Link href="/account/apply-organizer">
                  <Button 
                    size="lg"
                    className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-10 py-6 text-xl rounded-2xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                    data-testid="apply-business-account-cta"
                  >
                    <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Star className="h-6 w-6 mr-3 relative z-10" />
                    <span className="relative z-10">Apply for Business Account</span>
                  </Button>
                </Link>
              )}
              
            </div>
          </motion.div>
        </div>
      </div>

      {/* Communities Tab Navigation with Create Button */}
      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="relative flex space-x-1 bg-card/80 backdrop-blur-sm rounded-2xl p-2 shadow-large border border-border">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-accent/5 to-glow/5 rounded-2xl" />
          
          <button
            onClick={() => setSelectedTab('my')}
            className={`relative flex-1 px-6 py-4 rounded-xl transition-all duration-300 font-medium ${
              selectedTab === 'my'
                ? 'bg-gradient-to-r from-copper-500 to-accent text-black shadow-glow'
                : 'text-muted hover:text-accent hover:bg-copper-500/10'
            }`}
            data-testid="tab-my-communities"
          >
            {selectedTab === 'my' && (
              <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
            )}
            <Heart className="h-4 w-4 inline mr-2 relative z-10" />
            <span className="relative z-10">My Communities</span>
          </button>
          <button
            onClick={() => setSelectedTab('discover')}
            className={`relative flex-1 px-6 py-4 rounded-xl transition-all duration-300 font-medium ${
              selectedTab === 'discover'
                ? 'bg-gradient-to-r from-copper-500 to-accent text-black shadow-glow'
                : 'text-muted hover:text-accent hover:bg-copper-500/10'
            }`}
            data-testid="tab-discover"
          >
            {selectedTab === 'discover' && (
              <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
            )}
            <Sparkles className="h-4 w-4 inline mr-2 relative z-10" />
            <span className="relative z-10">Discover</span>
          </button>
          </div>
          
          {/* Create Community Button - Always Visible for Approved Organizers */}
          {organizer && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              disabled={createCommunityMutation.isPending}
              className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
              data-testid="create-community-button-header"
            >
              <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Plus className="h-5 w-5 mr-2 relative z-10" />
              <span className="relative z-10">
                {createCommunityMutation.isPending ? 'Creating...' : 'Create Community'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Communities Grid */}
      <div className="relative max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communities.map((community: Community, index) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ 
                y: -8,
                scale: 1.02
              }}
              data-testid={`community-card-${community.id}`}
              className="group"
            >
              {/* Firefly glow around each card */}
              <div className="absolute inset-0 bg-gradient-radial from-copper-500/20 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />
              
              <Card className="relative hover:shadow-glow-strong transition-all duration-500 cursor-pointer border border-border bg-card/90 backdrop-blur-sm overflow-hidden rounded-2xl">
                {/* Magical border effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-copper-500/50 via-accent/50 to-glow/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-[1px] rounded-2xl">
                  <div className="h-full w-full bg-card rounded-2xl" />
                </div>
                
                <div className="relative p-6">
                  <CardHeader className="p-0 pb-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-copper-500/30 bg-copper-500/10">
                        <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                        <Users className="h-8 w-8 text-accent relative z-10" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {community.isPrivate ? (
                          <Badge className="bg-gradient-to-r from-copper-500 to-accent text-black border-0 text-xs font-medium shadow-soft">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-accent/50 text-accent text-xs font-medium bg-accent/10">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardTitle className="font-fraunces text-xl font-bold text-text mb-4 group-hover:text-accent transition-colors duration-300">
                      {community.name}
                    </CardTitle>
                    
                    <CardDescription className="text-muted line-clamp-3 leading-relaxed">
                      {community.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {/* Community stats with firefly accents */}
                    <div className="flex items-center justify-between text-sm text-muted mb-8">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full" />
                          <Users className="h-4 w-4 text-accent relative z-10" />
                        </div>
                        <span className="font-semibold text-text">{community.memberCount || 0}</span>
                        <span>members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                          <MessageSquare className="h-4 w-4 text-glow relative z-10" />
                        </div>
                        <span className="font-semibold text-text">{community.postCount || 0}</span>
                        <span>posts</span>
                      </div>
                    </div>
                    
                    <Link href={`/communities/${community.slug || community.id}`}>
                      <Button className="relative w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold py-3 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 group/btn overflow-hidden" data-testid={`join-community-${community.id}`}>
                        {/* Button glow effect */}
                        <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        <Crown className="h-5 w-5 mr-2 relative z-10" />
                        <span className="relative z-10">Enter Community</span>
                      </Button>
                    </Link>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {communities.length === 0 && (
        <div className="relative text-center py-20">
          {/* Additional firefly atmosphere for empty state */}
          <div className="absolute top-16 left-1/4 w-32 h-32 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-1/3 w-40 h-40 bg-gradient-radial from-glow/25 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative max-w-lg mx-auto"
          >
            {/* Enhanced firefly icon */}
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-12">
              <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-accent/20 to-transparent rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Sparkles className="h-14 w-14 text-accent relative z-10" />
            </div>
            
            <h3 className="font-fraunces text-3xl font-bold text-text mb-6">
              {selectedTab === 'discover' ? (
                <>
                  <span>New Communities</span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">Coming Soon</span>
                </>
              ) : (
                <>
                  <span>No Communities</span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">Yet</span>
                </>
              )}
            </h3>
            
            <p className="text-muted mb-12 leading-relaxed text-lg">
              {selectedTab === 'discover' 
                ? 'We\'re curating exclusive communities for our members. Like fireflies gathering in the night, check back soon for exciting new connections!' 
                : 'Start your community journey by creating or joining communities tailored to your interests in Vancouver\'s vibrant cultural scene.'}
            </p>
            
            {organizer && selectedTab !== 'discover' && communities.length === 0 && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                disabled={createCommunityMutation.isPending}
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="create-community-button"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Plus className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">
                  {createCommunityMutation.isPending ? 'Creating...' : 'Create Community'}
                </span>
              </Button>
            )}
          </motion.div>
        </div>
      )}

      {/* Community Creation Wizard */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetWizard();
      }}>
        <DialogContent className="sm:max-w-[600px] bg-card border border-border overflow-hidden">
          {/* Premium wizard background with enhanced gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-copper-500/8 via-accent/8 to-glow/8" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-copper-500 via-accent to-glow" />
          
          {/* Wizard Header with Step Progress */}
          <DialogHeader className="relative pb-8">
            <div className="flex items-center justify-between mb-6">
              <DialogTitle className="font-fraunces text-2xl font-bold text-text flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                  <Crown className="h-6 w-6 text-accent relative z-10" />
                </div>
                Community Wizard
              </DialogTitle>
              
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Step</span>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-radial from-accent/20 via-transparent to-transparent rounded-full" />
                  <Badge className="relative bg-gradient-to-r from-copper-500 to-accent text-black border-0 font-bold">
                    {wizardStep} of {totalSteps}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Premium Step Progress Bar */}
            <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial from-glow/10 via-transparent to-transparent" />
              <motion.div
                className="h-full bg-gradient-to-r from-copper-500 via-accent to-glow rounded-full shadow-glow"
                initial={{ width: "0%" }}
                animate={{ width: `${(wizardStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            </div>
            
            {/* Dynamic step descriptions */}
            <DialogDescription className="text-muted leading-relaxed mt-4">
              {wizardStep === 1 && "Let's start with the basics. Give your community a name and describe its purpose."}
              {wizardStep === 2 && "Configure privacy settings and membership policies for your community."}
              {wizardStep === 3 && "Customize advanced features and community guidelines to enhance engagement."}
              {wizardStep === 4 && "Review your settings and launch your community."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Progressive Wizard Steps with Premium Animations */}
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative space-y-6 min-h-[400px]"
            >
              {/* Step 1: Basic Information */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-copper-500/30 bg-copper-500/10 mb-4">
                      <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                      <MessageSquare className="h-8 w-8 text-accent relative z-10" />
                    </div>
                    <h3 className="font-fraunces text-xl font-bold text-text mb-2">Community Basics</h3>
                    <p className="text-muted text-sm">Give your community a compelling identity</p>
                  </div>

                  <div>
                    <Label htmlFor="communityName" className="text-text font-medium">Community Name *</Label>
                    <Input
                      id="communityName"
                      value={communityForm.name}
                      onChange={(e) => setCommunityForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Vancouver Creative Collective"
                      className="mt-2 bg-input border-border focus:border-accent"
                      required
                      data-testid="input-community-name"
                    />
                    {communityForm.name.trim().length > 0 && communityForm.name.trim().length < 3 && (
                      <p className="text-sm text-red-400 mt-1">Community name must be at least 3 characters</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="communityDescription" className="text-text font-medium">Description</Label>
                    <Textarea
                      id="communityDescription"
                      value={communityForm.description}
                      onChange={(e) => setCommunityForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your community's mission, values, and what members can expect..."
                      className="mt-2 bg-input border-border focus:border-accent"
                      rows={4}
                      data-testid="input-community-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="communityCategory" className="text-text font-medium">Category</Label>
                    <Select
                      value={communityForm.category}
                      onValueChange={(value) => setCommunityForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="mt-2 bg-input border-border focus:border-accent">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arts">Arts & Culture</SelectItem>
                        <SelectItem value="music">Music & Entertainment</SelectItem>
                        <SelectItem value="business">Business & Professional</SelectItem>
                        <SelectItem value="wellness">Health & Wellness</SelectItem>
                        <SelectItem value="technology">Technology & Innovation</SelectItem>
                        <SelectItem value="community">Community & Social</SelectItem>
                        <SelectItem value="education">Education & Learning</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-text font-medium mb-2 block">Cover Photo (Optional)</Label>
                    <p className="text-sm text-muted mb-4">Add a cover photo to make your community stand out. This will be displayed on your community card.</p>
                    <ObjectUploader
                      onUpload={async (file: File) => {
                        const url = await uploadCoverImageMutation.mutateAsync(file);
                        setCommunityForm(prev => ({ ...prev, coverUrl: url }));
                        return url;
                      }}
                      accept="image/*"
                      maxSizeMB={5}
                      placeholder="Drop your cover image here or click to upload"
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors"
                      existingUrl={communityForm.coverUrl}
                      onRemove={() => setCommunityForm(prev => ({ ...prev, coverUrl: '' }))}
                    />
                    {uploadCoverImageMutation.isPending && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted">
                        <Camera className="h-4 w-4 animate-pulse" />
                        Uploading cover image...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Privacy & Settings */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-copper-500/30 bg-copper-500/10 mb-4">
                      <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                      <Shield className="h-8 w-8 text-accent relative z-10" />
                    </div>
                    <h3 className="font-fraunces text-xl font-bold text-text mb-2">Privacy & Access</h3>
                    <p className="text-muted text-sm">Configure how members discover and join your community</p>
                  </div>

                  <div className="space-y-6">
                    <Card className="border border-border bg-card/50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-text font-medium">Private Community</Label>
                          <p className="text-sm text-muted">Only invited members can see and join</p>
                        </div>
                        <Switch
                          checked={communityForm.isPrivate}
                          onCheckedChange={(checked) => setCommunityForm(prev => ({ ...prev, isPrivate: checked }))}
                          data-testid="switch-community-private"
                        />
                      </div>
                    </Card>
                    
                    <div>
                      <Label className="text-text font-medium">Membership Policy</Label>
                      <Select
                        value={communityForm.membershipPolicy}
                        onValueChange={(value) => setCommunityForm(prev => ({ ...prev, membershipPolicy: value }))}
                      >
                        <SelectTrigger className="mt-2 bg-input border-border focus:border-accent" data-testid="select-membership-policy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approval_required">Requires Approval - Organizers review applications</SelectItem>
                          <SelectItem value="open">Open to All - Anyone can join instantly</SelectItem>
                          <SelectItem value="closed">Invite Only - Completely private, invitation required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="welcomeMessage" className="text-text font-medium">Welcome Message</Label>
                      <Textarea
                        id="welcomeMessage"
                        value={communityForm.welcomeMessage}
                        onChange={(e) => setCommunityForm(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        placeholder="Welcome new members with a personalized message..."
                        className="mt-2 bg-input border-border focus:border-accent"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Advanced Features */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-copper-500/30 bg-copper-500/10 mb-4">
                      <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                      <Star className="h-8 w-8 text-accent relative z-10" />
                    </div>
                    <h3 className="font-fraunces text-xl font-bold text-text mb-2">Premium Features</h3>
                    <p className="text-muted text-sm">Customize engagement tools and community guidelines</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="text-text font-medium mb-4 block">Community Features</Label>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { key: 'allowDiscussions', label: 'Discussion Forums', icon: MessageSquare, desc: 'Enable threaded discussions and conversations' },
                          { key: 'allowEvents', label: 'Event Management', icon: Calendar, desc: 'Create and manage community events' },
                          { key: 'allowResources', label: 'Resource Library', icon: Zap, desc: 'Share files, documents, and resources' }
                        ].map((feature) => (
                          <Card key={feature.key} className="border border-border bg-card/50 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-radial from-accent/20 via-transparent to-transparent rounded-full" />
                                  <feature.icon className="h-5 w-5 text-accent relative z-10" />
                                </div>
                                <div>
                                  <Label className="text-text font-medium">{feature.label}</Label>
                                  <p className="text-sm text-muted">{feature.desc}</p>
                                </div>
                              </div>
                              <Switch
                                checked={communityForm[feature.key as keyof typeof communityForm] as boolean}
                                onCheckedChange={(checked) => setCommunityForm(prev => ({ ...prev, [feature.key]: checked }))}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="guidelines" className="text-text font-medium">Community Guidelines</Label>
                      <Textarea
                        id="guidelines"
                        value={communityForm.guidelines}
                        onChange={(e) => setCommunityForm(prev => ({ ...prev, guidelines: e.target.value }))}
                        placeholder="Set clear expectations for member behavior and community standards..."
                        className="mt-2 bg-input border-border focus:border-accent"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label className="text-text font-medium">Moderation Level</Label>
                      <Select
                        value={communityForm.moderationLevel}
                        onValueChange={(value) => setCommunityForm(prev => ({ ...prev, moderationLevel: value }))}
                      >
                        <SelectTrigger className="mt-2 bg-input border-border focus:border-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light - Minimal moderation, community self-regulated</SelectItem>
                          <SelectItem value="moderate">Moderate - Balanced moderation with guidelines enforcement</SelectItem>
                          <SelectItem value="strict">Strict - Active moderation with strict guidelines</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Launch */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-copper-500/30 bg-copper-500/10 mb-4">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
                      <Check className="h-8 w-8 text-glow relative z-10" />
                    </div>
                    <h3 className="font-fraunces text-xl font-bold text-text mb-2">Review & Launch</h3>
                    <p className="text-muted text-sm">Everything looks great! Ready to create your community?</p>
                  </div>

                  <Card className="border border-accent/30 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full" />
                          <Crown className="h-5 w-5 text-accent relative z-10" />
                        </div>
                        <h4 className="font-fraunces text-lg font-bold text-text">{communityForm.name}</h4>
                        <Badge className="bg-gradient-to-r from-copper-500 to-accent text-black border-0 text-xs">
                          {communityForm.category || 'Uncategorized'}
                        </Badge>
                      </div>
                      
                      {communityForm.description && (
                        <p className="text-muted text-sm leading-relaxed">{communityForm.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-text">Privacy:</span>
                          <span className="text-muted ml-2">{communityForm.isPrivate ? 'Private' : 'Public'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-text">Membership:</span>
                          <span className="text-muted ml-2">
                            {communityForm.membershipPolicy === 'approval_required' ? 'Requires Approval' :
                             communityForm.membershipPolicy === 'open' ? 'Open to All' : 'Invite Only'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-glow" />
                          <span className="text-muted">Premium Design</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-glow" />
                          <span className="text-muted">Advanced Features</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-glow" />
                          <span className="text-muted">Analytics Dashboard</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Premium Wizard Navigation */}
          <div className="relative pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={wizardStep === 1}
                className="border-border text-muted hover:bg-muted/10 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {/* Step Indicators */}
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < wizardStep 
                        ? 'bg-gradient-to-r from-copper-500 to-accent shadow-glow' 
                        : i === wizardStep - 1
                        ? 'bg-accent'
                        : 'bg-muted/30'
                    }`}
                  />
                ))}
              </div>

              {/* Next/Create Button */}
              {wizardStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(wizardStep)}
                  className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold shadow-glow hover:shadow-glow-strong transition-all duration-300 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <form onSubmit={handleCreateCommunity} className="inline">
                  <Button
                    type="submit"
                    disabled={createCommunityMutation.isPending || !isStepValid(wizardStep)}
                    className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold shadow-glow hover:shadow-glow-strong transition-all duration-300"
                    data-testid="button-submit-create"
                  >
                    {createCommunityMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Community...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Launch Community
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Cancel Button */}
            <div className="text-center mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                className="text-muted hover:text-text text-sm"
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}