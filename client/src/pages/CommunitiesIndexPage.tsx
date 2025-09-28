import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Plus, 
  Lock, 
  Globe, 
  Crown, 
  Star, 
  Sparkles, 
  Check, 
  Zap, 
  Calendar, 
  Award, 
  X, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  DollarSign,
  ArrowRight,
  Rocket,
  Target,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CommunityCard } from "@/components/CommunityCard";

interface Community {
  id: string;
  name: string;
  description: string;
  slug?: string;
  imageUrl?: string;
  coverUrl?: string;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  memberCount?: number;
  postCount?: number;
  membership?: {
    status: 'pending' | 'approved' | 'declined';
    role: 'member' | 'moderator' | 'owner';
  };
}

interface User {
  id: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

// Premium animation configurations
const containerAnimation = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const floatingAnimation = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export default function CommunitiesIndexPage() {
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my'>('discover');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [communityForm, setCommunityForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    membershipPolicy: 'approval_required',
  });

  const totalSteps = 3;
  const { toast } = useToast();

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
  const isApprovedOrganizer = organizer || (organizerApplication?.status === 'approved');
  const isPendingOrganizer = organizerApplication?.status === 'pending';

  // Get user's communities
  const { data: userCommunitiesData, isLoading: userCommunitiesLoading } = useQuery<{ communities: Community[], count: number }>({
    queryKey: ['/api/user/communities'],
    enabled: !!user,
    retry: false,
  });

  // Get all public communities for discovery - always enabled for discovery
  const { data: publicCommunitiesData, isLoading: publicCommunitiesLoading } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities'],
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
      setWizardStep(1);
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

  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityForm.name.trim()) {
      toast({ title: "Community name is required", variant: "destructive" });
      return;
    }
    createCommunityMutation.mutate(communityForm);
  };

  // Get communities to display based on tab
  let communities: Community[] = [];
  let ownedCommunities: Community[] = [];
  let memberCommunities: Community[] = [];
  
  // Public communities are always available
  const publicCommunities = publicCommunitiesData?.communities || [];
  
  if (user) {
    const userCommunities = userCommunitiesData?.communities || [];
    ownedCommunities = userCommunities.filter(c => c.membership?.role === 'owner');
    memberCommunities = userCommunities.filter(c => c.membership?.role === 'member' || c.membership?.role === 'moderator');
    
    if (selectedTab === 'my') {
      communities = userCommunities;
    } else {
      communities = publicCommunities;
    }
  } else {
    // For unauthenticated users, always show discover tab with public communities
    communities = publicCommunities;
  }

  // Show loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  // Not signed in - Show hero with two-panel pitch
  if (!user) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Ambient effects */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
        <motion.div 
          className="absolute top-20 left-20 w-64 h-64 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-full"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-32 right-32 w-96 h-96 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
        
        {/* Hero Section */}
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <Badge className="mb-8 bg-gradient-to-r from-copper-500/20 to-accent/20 text-accent border-accent/30 px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Premium Communities Platform
            </Badge>
            
            <h1 className="font-fraunces text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="text-text">Where Culture</span>
              <br />
              <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                Comes Together
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted max-w-3xl mx-auto">
              Join exclusive communities hosted by Vancouver's premier cultural businesses.
              Connect, engage, and unlock members-only experiences.
            </p>
          </motion.div>
          
          {/* Two-Panel Pitch */}
          <motion.div 
            className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* For Users Panel */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-premium-surface to-premium-surface-elevated border-premium-border hover:border-accent/50 transition-all duration-300 hover:shadow-glow group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-accent/20 via-transparent to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-copper-500/20 border border-accent/30">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="font-fraunces text-2xl">For Members</CardTitle>
                </div>
                <CardDescription className="text-lg text-premium-text-secondary">
                  Join communities hosted by your favourite businesses
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    { icon: MessageSquare, text: "Members-only updates & announcements" },
                    { icon: Calendar, text: "Early access to events and experiences" },
                    { icon: Star, text: "Exclusive content and perks" },
                    { icon: Heart, text: "Connect with like-minded community members" },
                    { icon: Shield, text: "Curated, high-quality communities" }
                  ].map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                    >
                      <feature.icon className="h-5 w-5 text-accent flex-shrink-0" />
                      <span className="text-premium-text-secondary">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="pt-4">
                  <Link href="/account/signup">
                    <Button 
                      size="lg"
                      className="w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700 text-white font-semibold transition-all duration-300 hover:shadow-glow"
                      data-testid="join-communities-button"
                    >
                      Join Communities - Free
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  
                  <p className="text-center text-sm text-premium-text-muted mt-4">
                    Already have an account?{" "}
                    <Link href="/account/signin">
                      <span className="text-accent hover:underline cursor-pointer">Sign in</span>
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* For Businesses Panel */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-premium-surface-elevated to-premium-surface border-premium-border hover:border-yellow-500/50 transition-all duration-300 hover:shadow-glow-strong group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-yellow-500/20 via-transparent to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Premium Badge */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Crown className="h-3 w-3 mr-1" />
                  Business
                </Badge>
              </div>
              
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
                    <Building2 className="h-6 w-6 text-yellow-400" />
                  </div>
                  <CardTitle className="font-fraunces text-2xl">For Businesses</CardTitle>
                </div>
                <CardDescription className="text-lg text-premium-text-secondary">
                  Build and monetize your cultural community
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-yellow-400">$19.99</span>
                    <span className="text-premium-text-muted">/month</span>
                  </div>
                  <p className="text-sm text-premium-text-secondary">
                    or <span className="font-semibold text-yellow-400">$199/year</span> (save 17%)
                  </p>
                </div>
                
                {/* Features */}
                <div className="space-y-4">
                  {[
                    { icon: Rocket, text: "Unlimited community members" },
                    { icon: BarChart3, text: "Advanced analytics & insights" },
                    { icon: Target, text: "Direct member engagement tools" },
                    { icon: DollarSign, text: "Monetization opportunities" },
                    { icon: Zap, text: "Priority support & onboarding" }
                  ].map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                    >
                      <feature.icon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span className="text-premium-text-secondary">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="pt-4">
                  <Link href="/account/apply-organizer">
                    <Button 
                      size="lg"
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold transition-all duration-300 hover:shadow-glow-strong"
                      data-testid="apply-business-button"
                    >
                      Apply for Business Account
                      <Crown className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  
                  <p className="text-center text-xs text-premium-text-muted mt-4">
                    30-day free trial • No credit card required
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Signed in - Show community discovery/management
  return (
    <div className="min-h-screen bg-bg relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="font-fraunces text-4xl md:text-5xl font-bold text-text mb-3">
                Communities
              </h1>
              <p className="text-lg text-muted">
                {isApprovedOrganizer 
                  ? "Manage your communities and discover new ones"
                  : "Discover and join exclusive cultural communities"}
              </p>
            </div>
            
            {isApprovedOrganizer && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700 text-white font-semibold shadow-glow"
                  data-testid="create-community-button"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Community
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'discover' | 'my')} className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-premium-surface border border-premium-border">
            <TabsTrigger 
              value="discover" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500/20 data-[state=active]:to-accent/20"
              data-testid="discover-tab"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger 
              value="my" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500/20 data-[state=active]:to-accent/20"
              data-testid="my-communities-tab"
            >
              <Crown className="h-4 w-4 mr-2" />
              My Communities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="space-y-8">
            {/* Discover Communities */}
            {publicCommunitiesLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="bg-premium-surface border-premium-border">
                    <div className="h-48 bg-gradient-to-br from-copper-500/10 to-copper-900/10">
                      <Skeleton className="h-full w-full" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : communities.length === 0 ? (
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 text-premium-text-muted mx-auto mb-4 opacity-50" />
                  <h3 className="font-fraunces text-xl font-semibold text-premium-text-primary mb-2">
                    No Communities Yet
                  </h3>
                  <p className="text-premium-text-secondary max-w-md mx-auto">
                    Be among the first to discover exclusive communities as they launch.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div 
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerAnimation}
                initial="hidden"
                animate="show"
              >
                {communities.map((community, idx) => (
                  <CommunityCard
                    key={community.id}
                    {...community}
                    index={idx}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>
          
          <TabsContent value="my" className="space-y-8">
            {/* Owned Communities First */}
            {ownedCommunities.length > 0 && (
              <div>
                <h2 className="font-fraunces text-2xl font-semibold text-text mb-6 flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  Communities You Own
                </h2>
                <motion.div 
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerAnimation}
                  initial="hidden"
                  animate="show"
                >
                  {ownedCommunities.map((community, idx) => (
                    <CommunityCard
                      key={community.id}
                      {...community}
                      isOwner={true}
                      index={idx}
                    />
                  ))}
                </motion.div>
              </div>
            )}
            
            {/* Member Communities */}
            {memberCommunities.length > 0 && (
              <div>
                <h2 className="font-fraunces text-2xl font-semibold text-text mb-6 flex items-center gap-2">
                  <Users className="h-6 w-6 text-accent" />
                  Communities You're In
                </h2>
                <motion.div 
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerAnimation}
                  initial="hidden"
                  animate="show"
                >
                  {memberCommunities.map((community, idx) => (
                    <CommunityCard
                      key={community.id}
                      {...community}
                      index={idx}
                    />
                  ))}
                </motion.div>
              </div>
            )}
            
            {/* Empty State */}
            {communities.length === 0 && (
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 text-premium-text-muted mx-auto mb-4 opacity-50" />
                  <h3 className="font-fraunces text-xl font-semibold text-premium-text-primary mb-2">
                    {isApprovedOrganizer 
                      ? "Create Your First Community"
                      : "Join Your First Community"}
                  </h3>
                  <p className="text-premium-text-secondary max-w-md mx-auto mb-6">
                    {isApprovedOrganizer 
                      ? "Start building your cultural community and connect with your audience."
                      : "Discover communities that match your interests and connect with like-minded people."}
                  </p>
                  {isApprovedOrganizer ? (
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Community
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedTab('discover')}
                      variant="outline"
                      className="border-accent/50 text-accent hover:bg-accent/10"
                    >
                      Browse Communities
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Create Community Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg bg-premium-surface border-premium-border">
            <DialogHeader>
              <DialogTitle className="font-fraunces text-2xl">Create Community</DialogTitle>
              <DialogDescription>
                Step {wizardStep} of {totalSteps}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateCommunity} className="space-y-6">
              {/* Step 1: Basic Info */}
              {wizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="name">Community Name</Label>
                    <Input
                      id="name"
                      value={communityForm.name}
                      onChange={(e) => setCommunityForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Vancouver Food Lovers"
                      className="bg-premium-surface border-premium-border"
                      data-testid="community-name-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={communityForm.description}
                      onChange={(e) => setCommunityForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell people what your community is about..."
                      rows={4}
                      className="bg-premium-surface border-premium-border"
                      data-testid="community-description-input"
                    />
                  </div>
                </motion.div>
              )}
              
              {/* Step 2: Privacy Settings */}
              {wizardStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="private">Private Community</Label>
                      <p className="text-sm text-premium-text-muted">
                        Only members can see content
                      </p>
                    </div>
                    <Switch
                      id="private"
                      checked={communityForm.isPrivate}
                      onCheckedChange={(checked) => setCommunityForm(prev => ({ ...prev, isPrivate: checked }))}
                      data-testid="community-private-switch"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="policy">Membership Policy</Label>
                    <Select
                      value={communityForm.membershipPolicy}
                      onValueChange={(value) => setCommunityForm(prev => ({ ...prev, membershipPolicy: value }))}
                    >
                      <SelectTrigger 
                        id="policy"
                        className="bg-premium-surface border-premium-border"
                        data-testid="membership-policy-select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open - Anyone can join</SelectItem>
                        <SelectItem value="approval_required">Approval Required</SelectItem>
                        <SelectItem value="closed">Closed - Invite only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
              
              {/* Step 3: Review */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <Card className="bg-premium-surface/50 border-premium-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Review Your Community</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-premium-text-muted">Name</p>
                        <p className="font-semibold">{communityForm.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-premium-text-muted">Description</p>
                        <p className="text-sm">{communityForm.description || 'No description'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-premium-text-muted">Privacy</p>
                        <p className="font-semibold">{communityForm.isPrivate ? 'Private' : 'Public'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-premium-text-muted">Membership</p>
                        <p className="font-semibold">
                          {communityForm.membershipPolicy === 'open' && 'Open to all'}
                          {communityForm.membershipPolicy === 'approval_required' && 'Requires approval'}
                          {communityForm.membershipPolicy === 'closed' && 'Invite only'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowCreateDialog(false)}
                    disabled={createCommunityMutation.isPending}
                  >
                    {wizardStep === 1 ? 'Cancel' : 'Back'}
                  </Button>
                  
                  {wizardStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={() => setWizardStep(wizardStep + 1)}
                      disabled={!communityForm.name.trim()}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={createCommunityMutation.isPending}
                      className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
                      data-testid="create-community-submit"
                    >
                      {createCommunityMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Create Community
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}