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
import { Users, MessageSquare, Heart, Plus, Lock, Globe, Crown, Star, Sparkles, Check, Zap, Calendar, Award, X } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedTab, setSelectedTab] = useState<'all' | 'my' | 'discover'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [communityForm, setCommunityForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    membershipPolicy: 'approval_required'
  });
  const { toast } = useToast();
  
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

  // Get user's own community if they're an approved organizer
  const { data: userCommunity } = useQuery<Community>({
    queryKey: ['/api/organizers/community'],
    enabled: !!organizer,
    retry: false,
  });

  // Get user's memberships
  const { data: userMemberships } = useQuery<UserMemberships>({
    queryKey: ['/api/user/memberships'],
    enabled: !!user,
    retry: false,
  });

  // Create community mutation
  const createCommunityMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPrivate?: boolean; membershipPolicy?: string }) => {
      const response = await apiRequest('POST', '/api/communities', data);
      if (!response.ok) {
        throw new Error('Failed to create community');
      }
      return response;
    },
    onSuccess: () => {
      toast({ title: "Community created successfully!" });
      setShowCreateDialog(false);
      setCommunityForm({ name: '', description: '', isPrivate: false, membershipPolicy: 'approval_required' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizers/community'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/memberships'] });
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
    if (selectedTab === 'all') {
      // Show user's own community and communities they're members of
      communities = [];
      if (userCommunity) communities.push(userCommunity);
      if (userMemberships?.communities) {
        communities.push(...userMemberships.communities);
      }
    } else if (selectedTab === 'my') {
      // Show only communities user owns or is a member of
      communities = [];
      if (userCommunity) communities.push(userCommunity);
      if (userMemberships?.communities) {
        communities.push(...userMemberships.communities);
      }
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
  
  // Signed out users see pricing page, signed in users see communities
  if (!user) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Firefly atmosphere */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-radial from-copper-500/10 via-transparent to-transparent rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-radial from-glow/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-gradient-radial from-accent/10 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        
        {/* Premium Hero Section */}
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
              {/* Premium badge with firefly glow */}
              <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full border border-copper-500/30 bg-copper-500/10 text-accent text-sm font-medium mb-12 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full" />
                <Crown className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Premium Communities</span>
                <Sparkles className="h-4 w-4 relative z-10" />
              </div>
              
              <h1 className="font-fraunces text-5xl md:text-7xl font-bold mb-12 leading-tight">
                <span className="text-text">Elevate Your</span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">Community</span>
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
                <span className="text-text">Experience</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted mb-16 max-w-4xl mx-auto leading-relaxed">
                Join exclusive, curated communities where meaningful connections flourish like fireflies in the night.
                <br className="hidden md:block" />
                Experience premium features designed for authentic community building.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Premium Pricing Section - Enhanced with Scroll Animations */}
        <motion.div 
          className="relative max-w-5xl mx-auto px-6 py-20"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Enhanced firefly glows with magnetic effect */}
          <motion.div 
            className="absolute top-10 right-20 w-32 h-32 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3] 
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
          />
          <motion.div 
            className="absolute bottom-20 left-16 w-40 h-40 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2] 
            }}
            transition={{ duration: 5, repeat: Infinity, delay: 2.5 }}
          />
          
          <motion.div 
            className="relative text-center mb-20"
            variants={fadeInUp}
          >
            <motion.h2 
              className="font-fraunces text-4xl md:text-5xl font-bold mb-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="text-text">Choose Your</span>
              <motion.span 
                className="block bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
              >
                Premium Experience
              </motion.span>
            </motion.h2>
            <motion.p 
              className="text-lg text-muted max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
            >
              Unlock exclusive access to curated communities, premium features, and elevated networking opportunities in Vancouver's cultural scene.
            </motion.p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
            >
              {/* Firefly glow around card */}
              <div className="absolute inset-0 bg-gradient-radial from-copper-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />
              
              <Card className="relative border border-border bg-card backdrop-blur-sm hover:border-copper-500/50 transition-all duration-300 hover:shadow-glow overflow-hidden">
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-transparent to-glow/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="relative text-center pb-8">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-copper-500/20 bg-copper-500/10 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-radial from-copper-500/30 via-transparent to-transparent rounded-full animate-pulse" />
                    <Zap className="h-10 w-10 text-accent relative z-10" />
                  </div>
                  <CardTitle className="font-fraunces text-2xl font-bold text-text mb-4">Monthly Access</CardTitle>
                  <div className="space-y-3">
                    <div className="text-5xl font-bold text-text">
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">$19</span>
                      <span className="text-lg font-normal text-muted">.99</span>
                    </div>
                    <p className="text-muted">per month</p>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  <div className="space-y-4">
                    {[
                      'Access to all premium communities',
                      'Priority member verification',
                      'Advanced networking tools',
                      'Exclusive events & experiences',
                      'Premium support'
                    ].map((feature, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                          <Check className="h-5 w-5 text-glow flex-shrink-0 relative z-10" />
                        </div>
                        <span className="text-text leading-relaxed">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                  <Link href="/account/signup" className="block">
                    <MotionButton 
                      className="w-full mt-8 bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-semibold py-4 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300" 
                      data-testid="monthly-signup-button"
                      variants={buttonPress}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      Start Monthly Plan
                    </MotionButton>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Annual Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative group"
            >
              {/* Popular Badge with glow */}
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-radial from-glow/50 via-transparent to-transparent rounded-full blur-md" />
                  <div className="relative bg-gradient-to-r from-copper-500 to-accent text-black px-6 py-2 rounded-full text-sm font-bold shadow-glow">
                    <Award className="h-4 w-4 inline mr-2" />
                    Most Popular
                  </div>
                </div>
              </div>
              
              {/* Strong firefly glow around featured card */}
              <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-copper-500/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-2xl" />
              
              <Card className="relative border-2 border-accent hover:border-glow transition-all duration-300 hover:shadow-glow-strong bg-card backdrop-blur-sm overflow-hidden">
                {/* Inner magical glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-copper-500/10 via-accent/5 to-glow/10" />
                
                <CardHeader className="relative text-center pb-8">
                  <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-copper-500 to-accent mx-auto mb-8">
                    <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                    <Crown className="h-12 w-12 text-black relative z-10" />
                  </div>
                  <CardTitle className="font-fraunces text-2xl font-bold text-text mb-4">Annual Access</CardTitle>
                  <div className="space-y-3">
                    <div className="text-5xl font-bold text-text">
                      <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">$199</span>
                      <span className="text-lg font-normal text-muted">.00</span>
                    </div>
                    <p className="text-muted">per year</p>
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full blur-sm" />
                      <div className="relative px-4 py-2 bg-gradient-to-r from-glow/20 to-accent/20 text-accent rounded-full text-sm font-medium border border-accent/30">
                        Save $40 yearly
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  <div className="space-y-4">
                    {[
                      'Everything in Monthly plan',
                      'Exclusive annual member perks', 
                      'Priority community placement',
                      'Quarterly networking events',
                      'VIP concierge support',
                      '2 months completely FREE'
                    ].map((feature, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full" />
                          <Check className="h-5 w-5 text-glow flex-shrink-0 relative z-10" />
                        </div>
                        <span className="text-text leading-relaxed font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                  <Link href="/account/signup" className="block">
                    <MotionButton 
                      className="w-full mt-8 bg-gradient-to-r from-accent to-glow hover:from-copper-500 hover:to-accent text-black font-bold py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300" 
                      data-testid="annual-signup-button"
                      variants={buttonPress}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      Start Annual Plan
                    </MotionButton>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="relative text-center mt-20"
          >
            <p className="text-muted mb-8 text-lg">
              Already have an account?
            </p>
            <Link href="/account/signin">
              <MotionButton 
                variant="outline" 
                size="lg" 
                className="relative border-accent/50 text-accent hover:bg-accent/10 hover:border-accent backdrop-blur-sm px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-glow" 
                data-testid="signin-button"
                variants={buttonPress}
                whileHover="whileHover"
                whileTap="whileTap"
              >
                <div className="absolute inset-0 bg-gradient-radial from-accent/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                <span className="relative z-10 font-medium">Sign In to Your Communities</span>
              </MotionButton>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }
  
  // Signed in users see community discovery
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient firefly atmosphere */}
      <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
      <div className="absolute top-32 left-20 w-48 h-48 bg-gradient-radial from-copper-500/15 via-transparent to-transparent rounded-full animate-pulse" />
      <div className="absolute bottom-40 right-32 w-64 h-64 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Premium Header for Signed In Users */}
      <div className="relative bg-gradient-to-br from-premium-surface to-premium-surface-elevated border-b border-premium-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-copper-500/10 via-accent/5 to-glow/10" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Premium member badge with enhanced glow */}
            <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full border border-accent/30 bg-copper-500/10 text-accent text-sm font-medium mb-10 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
              <Crown className="h-5 w-5 relative z-10" />
              <span className="relative z-10 font-semibold">Premium Member</span>
              <Sparkles className="h-5 w-5 relative z-10" />
            </div>
            
            <h1 className="font-fraunces text-4xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="text-text">Welcome to Your</span>
              <br />
              <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                Exclusive Communities
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-muted max-w-4xl mx-auto leading-relaxed">
              Discover, connect, and engage with premium communities curated for meaningful connections in Vancouver's vibrant cultural scene.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Premium Tab Navigation with Create Button */}
      <div className="relative max-w-6xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="relative flex space-x-1 bg-card/80 backdrop-blur-sm rounded-2xl p-2 shadow-large border border-border">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-accent/5 to-glow/5 rounded-2xl" />
          
            <button
            onClick={() => setSelectedTab('all')}
            className={`relative flex-1 px-6 py-4 rounded-xl transition-all duration-300 font-medium ${
              selectedTab === 'all'
                ? 'bg-gradient-to-r from-copper-500 to-accent text-black shadow-glow'
                : 'text-muted hover:text-accent hover:bg-copper-500/10'
            }`}
            data-testid="tab-all-communities"
          >
            {selectedTab === 'all' && (
              <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
            )}
            <Calendar className="h-4 w-4 inline mr-2 relative z-10" />
            <span className="relative z-10">All Communities</span>
          </button>
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

      {/* Premium Communities Grid */}
      <div className="relative max-w-6xl mx-auto px-6 pb-12">
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

      {/* Premium Empty State */}
      {communities.length === 0 && (
        <div className="relative text-center py-24">
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
                ? 'We\'re curating exclusive communities for our premium members. Like fireflies gathering in the night, check back soon for exciting new connections!' 
                : 'Start your community journey by creating or joining premium communities tailored to your interests in Vancouver\'s vibrant cultural scene.'}
            </p>
            
            {organizer && selectedTab !== 'discover' && !userCommunity && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                disabled={createCommunityMutation.isPending}
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="create-community-button"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Plus className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">
                  {createCommunityMutation.isPending ? 'Creating...' : 'Create Premium Community'}
                </span>
              </Button>
            )}
          </motion.div>
        </div>
      )}

      {/* Create Community Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border overflow-hidden">
          {/* Premium dialog background */}
          <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
          
          <DialogHeader className="relative">
            <DialogTitle className="font-fraunces text-2xl font-bold text-text flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                <Crown className="h-6 w-6 text-accent relative z-10" />
              </div>
              Create Premium Community
            </DialogTitle>
            <DialogDescription className="text-muted leading-relaxed">
              Build an exclusive community for your members with premium features and copper-bronze-gold design.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateCommunity} className="relative space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="communityName" className="text-text font-medium">Community Name *</Label>
                <Input
                  id="communityName"
                  value={communityForm.name}
                  onChange={(e) => setCommunityForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your community name"
                  className="mt-2 bg-input border-border focus:border-accent"
                  required
                  data-testid="input-community-name"
                />
              </div>
              
              <div>
                <Label htmlFor="communityDescription" className="text-text font-medium">Description</Label>
                <Textarea
                  id="communityDescription"
                  value={communityForm.description}
                  onChange={(e) => setCommunityForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your community and its purpose"
                  className="mt-2 bg-input border-border focus:border-accent"
                  rows={3}
                  data-testid="input-community-description"
                />
              </div>
              
              <div className="space-y-4">
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
                      <SelectItem value="approval_required">Requires Approval</SelectItem>
                      <SelectItem value="open">Open to All</SelectItem>
                      <SelectItem value="closed">Invite Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-border text-muted hover:bg-muted/10"
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCommunityMutation.isPending || !communityForm.name.trim()}
                className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold shadow-glow hover:shadow-glow-strong transition-all duration-300"
                data-testid="button-submit-create"
              >
                {createCommunityMutation.isPending ? 'Creating...' : 'Create Community'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}