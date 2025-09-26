import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  MessageSquare, 
  Settings, 
  UserPlus, 
  Lock, 
  Globe, 
  Clock,
  Pin,
  ArrowLeft,
  Crown,
  Star,
  Sparkles,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Community {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  status: string;
}

interface Membership {
  id: string;
  status: 'pending' | 'approved' | 'declined';
  role: 'member' | 'moderator' | 'owner';
  requestedAt: string;
  approvedAt?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  postType: 'announcement' | 'update' | 'event';
  isPinned: boolean;
  createdAt: string;
  authorId: string;
}

interface User {
  id: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

interface CommunityDetailResponse {
  community?: Community;
  membership?: Membership;
  posts?: Post[];
  members?: any[];
  canManage?: boolean;
}

export default function CommunityDetailPage() {
  const [match, params] = useRoute("/communities/:slug");
  const communitySlug = params?.slug;
  
  const [activeTab, setActiveTab] = useState("posts");
  const { toast } = useToast();

  // Get current user (fixed authentication pattern)
  const { data: authData, isLoading: userLoading } = useQuery<{ user?: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const user = authData?.user;

  // Get community details with real API call
  const { data: communityData, isLoading, error } = useQuery<CommunityDetailResponse>({
    queryKey: ['/api/communities', communitySlug],
    enabled: !!communitySlug && !!user,
    retry: false,
  });

  // Join community mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/communities/${communitySlug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to join community');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Membership request submitted!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to join community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const community = communityData?.community;
  const membership = communityData?.membership;
  const posts = communityData?.posts || [];
  const members = communityData?.members || [];
  const canManage = communityData?.canManage || false;

  // Show premium loading state while checking authentication
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
                Premium Community
              </span>
            </h2>
            <p className="text-muted leading-relaxed">
              Preparing your exclusive community experience...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Premium sign-in required page
  if (!user) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Firefly atmosphere */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-radial from-copper-500/10 via-transparent to-transparent rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-radial from-glow/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full border border-accent/30 bg-accent/10 mx-auto mb-12">
              <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
              <Shield className="h-12 w-12 text-accent relative z-10" />
            </div>
            <h1 className="font-fraunces text-4xl md:text-5xl font-bold mb-8">
              <span className="text-text">Premium Access</span>
              <br />
              <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">Required</span>
            </h1>
            <p className="text-xl text-muted mb-12 max-w-3xl mx-auto leading-relaxed">
              This exclusive community is reserved for authenticated premium members like fireflies gathering in their special place. 
              Sign in to unlock your premium community experience.
            </p>
            <Link href="/account/signin">
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="signin-required-button"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Crown className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">Sign In to Continue</span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Premium community not found page
  if (!community && !isLoading) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Dim firefly atmosphere for error state */}
        <div className="absolute inset-0 bg-gradient-radial from-muted-foreground/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-gradient-radial from-destructive/10 via-transparent to-transparent rounded-full animate-pulse" />
        
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full border border-destructive/30 bg-destructive/10 mx-auto mb-12">
              <div className="absolute inset-0 bg-gradient-radial from-destructive/20 via-transparent to-transparent rounded-full animate-pulse" />
              <AlertCircle className="h-12 w-12 text-destructive relative z-10" />
            </div>
            <h1 className="font-fraunces text-4xl md:text-5xl font-bold mb-8">
              <span className="text-text">Community</span>
              <br />
              <span className="text-destructive">Not Found</span>
            </h1>
            <p className="text-xl text-muted mb-12 leading-relaxed">
              The community you're looking for doesn't exist or may have been removed.
            </p>
            <Link href="/communities">
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="back-to-communities-button"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowLeft className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">Back to Communities</span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Premium loading state for community data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        {/* Subtle firefly animation while loading */}
        <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-radial from-copper-500/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-40 left-32 w-48 h-48 bg-gradient-radial from-accent/10 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Enhanced header skeleton */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-large border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-6">
                  <div className="h-10 bg-gradient-to-r from-copper-500/20 to-accent/20 rounded-lg animate-pulse" />
                  <div className="flex gap-3">
                    <div className="h-7 w-24 bg-muted/50 rounded-full animate-pulse" />
                    <div className="h-7 w-28 bg-muted/50 rounded-full animate-pulse" />
                  </div>
                  <div className="h-5 bg-muted/50 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted/30 rounded w-1/2 animate-pulse" />
                </div>
                <div className="h-12 w-36 bg-gradient-to-r from-copper-500/20 to-accent/20 rounded-xl animate-pulse" />
              </div>
            </div>
            
            {/* Enhanced content skeleton */}
            <div className="space-y-6">
              <div className="h-14 bg-card/60 backdrop-blur-sm rounded-2xl animate-pulse border border-border/50" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-card/60 backdrop-blur-sm rounded-2xl animate-pulse border border-border/50" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient firefly atmosphere */}
      <div className="absolute inset-0 bg-gradient-radial from-glow/5 via-transparent to-transparent" />
      <div className="absolute top-32 left-20 w-48 h-48 bg-gradient-radial from-copper-500/15 via-transparent to-transparent rounded-full animate-pulse" />
      <div className="absolute bottom-40 right-32 w-64 h-64 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-3/4 left-1/4 w-32 h-32 bg-gradient-radial from-accent/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '2.5s' }} />
      
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Premium Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link href="/communities">
            <Button 
              variant="ghost" 
              className="group hover:bg-card/50 backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-copper-500/30 rounded-xl px-4 py-2" 
              data-testid="back-to-communities"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform text-accent" />
              <span className="font-medium text-text group-hover:text-accent transition-colors">Back to Communities</span>
            </Button>
          </Link>
        </motion.div>

        {/* Premium Community Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative group"
        >
          {/* Firefly border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-copper-500/50 via-accent/50 to-glow/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl p-[1px]">
            <div className="h-full w-full bg-card rounded-2xl" />
          </div>
          
          <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large mb-8 overflow-hidden hover:shadow-glow-strong transition-all duration-500">
            {/* Magical header background */}
            <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-br from-copper-500/10 via-accent/10 to-glow/10 rounded-bl-[120px]" />
            <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
            
            <CardHeader className="relative pb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-copper-500 to-accent border border-copper-500/30">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                      <Crown className="h-8 w-8 text-black relative z-10" />
                    </div>
                    <div>
                      <CardTitle className="font-fraunces text-3xl md:text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                          {community?.name}
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                          <Star className="h-5 w-5 text-glow fill-glow relative z-10" />
                        </div>
                        <span className="text-sm font-semibold text-accent">Premium Community</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium badges */}
                  <div className="flex items-center flex-wrap gap-3 mb-8">
                    {community?.isPrivate ? (
                      <Badge className="bg-gradient-to-r from-copper-600 to-copper-800 text-white border-0 shadow-soft px-3 py-1">
                        <Lock className="h-3 w-3 mr-1" />
                        Exclusive Private
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-glow/80 to-accent text-black border-0 shadow-soft px-3 py-1">
                        <Globe className="h-3 w-3 mr-1" />
                        Open Community
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-accent/50 text-accent capitalize font-medium bg-accent/10 px-3 py-1">
                      <Shield className="h-3 w-3 mr-1" />
                      {community?.membershipPolicy?.replace('_', ' ')}
                    </Badge>
                    {membership && (
                      <Badge 
                        className={`${membership.status === 'approved' 
                          ? 'bg-gradient-to-r from-glow/80 to-accent text-black' 
                          : membership.status === 'pending'
                          ? 'bg-gradient-to-r from-copper-400 to-copper-600 text-white'
                          : 'bg-gradient-to-r from-destructive/80 to-destructive text-white'
                        } border-0 shadow-soft capitalize font-medium px-3 py-1`}
                      >
                        {membership.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {membership.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {membership.status}
                      </Badge>
                    )}
                  </div>
                  
                  <CardDescription className="text-lg text-muted leading-relaxed">
                    {community?.description}
                  </CardDescription>
                </div>
                
                {/* Premium action buttons */}
                <div className="flex flex-col gap-4 ml-8">
                  {canManage && (
                    <Button 
                      className="relative bg-gradient-to-r from-muted-foreground/80 to-muted-foreground hover:from-muted-foreground hover:to-foreground text-white font-bold px-6 py-3 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 group overflow-hidden" 
                      data-testid="manage-community-button"
                    >
                      <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Settings className="h-5 w-5 mr-2 relative z-10" />
                      <span className="relative z-10">Manage Community</span>
                    </Button>
                  )}
                  {!membership && (
                    <Button 
                      className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                      data-testid="join-community-button"
                    >
                      <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <UserPlus className="h-5 w-5 mr-2 relative z-10" />
                      <span className="relative z-10">Join Premium Community</span>
                    </Button>
                  )}
                  {membership?.status === 'approved' && (
                    <div className="relative flex items-center gap-3 px-4 py-3 bg-accent/10 rounded-xl border border-accent/30">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                      <CheckCircle className="h-5 w-5 text-accent relative z-10" />
                      <span className="text-sm font-bold text-accent relative z-10">Premium Member</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Premium Community Content */}
        {membership?.status === 'approved' || canManage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="relative grid w-full grid-cols-3 bg-card/80 backdrop-blur-sm p-2 rounded-2xl shadow-large border border-border">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-accent/5 to-glow/5 rounded-2xl" />
                
                <TabsTrigger 
                  value="posts" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-posts"
                >
                  {activeTab === 'posts' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <MessageSquare className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">Posts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-members"
                >
                  {activeTab === 'members' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <Users className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">Members</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="about" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-about"
                >
                  {activeTab === 'about' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <Shield className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">About</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-6 mt-8">
                {posts.length > 0 ? (
                  posts.map((post: Post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      data-testid={`post-${post.id}`}
                      className="group"
                    >
                      <Card className={`relative border border-border bg-card/90 backdrop-blur-sm shadow-large hover:shadow-glow-strong transition-all duration-500 overflow-hidden group rounded-2xl ${
                        post.isPinned 
                          ? 'ring-2 ring-accent/50 bg-gradient-to-br from-accent/10 via-copper-500/5 to-glow/10' 
                          : 'hover:ring-2 hover:ring-copper-500/30'
                      }`}>
                        {/* Firefly glow effect for posts */}
                        <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                {post.isPinned && (
                                  <div className="relative flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-accent to-glow text-black rounded-full text-xs font-bold shadow-glow">
                                    <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                                    <Pin className="h-3 w-3 relative z-10" />
                                    <span className="relative z-10">Pinned</span>
                                  </div>
                                )}
                                <Badge className={`capitalize font-medium ${
                                  post.postType === 'announcement' 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0'
                                    : post.postType === 'event'
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0'
                                }`}>
                                  {post.postType}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <CardTitle className="font-fraunces text-xl font-bold text-text group-hover:text-accent transition-colors duration-300 relative z-10">
                                {post.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-muted whitespace-pre-line leading-relaxed relative z-10">
                            {post.content}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-6">
                      <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                      <MessageSquare className="h-10 w-10 text-accent relative z-10" />
                    </div>
                    <h3 className="font-fraunces text-2xl font-bold text-text mb-4">
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">No posts yet</span>
                    </h3>
                    <p className="text-muted leading-relaxed">
                      Be the first to start a conversation in this premium community like a firefly lighting up the night!
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-8">
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  {/* Firefly glow for members section */}
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                        <Users className="h-6 w-6 text-black relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        Premium Members
                      </span>
                    </CardTitle>
                    <p className="text-muted mt-3 leading-relaxed">
                      Connect with verified members of this exclusive community, each bringing their own light to our gathering.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {members.length > 0 ? (
                      <div className="space-y-4">
                        {members.map((member, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="relative flex items-center space-x-4 p-6 rounded-xl bg-gradient-to-r from-card/80 to-accent/10 hover:shadow-glow transition-all duration-300 group/member border border-border/50"
                          >
                            {/* Member glow effect */}
                            <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover/member:opacity-100 transition-opacity duration-300 rounded-xl" />
                            
                            <Avatar className="relative h-14 w-14 ring-2 ring-accent/50 group-hover/member:ring-accent transition-colors">
                              <AvatarFallback className="bg-gradient-to-r from-copper-500 to-accent text-black font-bold text-lg relative z-10">
                                OR
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 relative z-10">
                              <p className="font-bold text-text group-hover/member:text-accent transition-colors">Community Organizer</p>
                              <p className="text-sm text-muted">Leading this premium community with passion</p>
                            </div>
                            <Badge className="relative bg-gradient-to-r from-copper-600 to-copper-800 text-white border-0 shadow-soft px-3 py-1">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-6">
                          <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                          <Users className="h-10 w-10 text-accent relative z-10" />
                        </div>
                        <h3 className="font-fraunces text-xl font-bold text-text mb-4">
                          <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">Building our community</span>
                        </h3>
                        <p className="text-muted leading-relaxed">
                          More premium members will gather here like fireflies drawn to our light as they join
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about" className="mt-8">
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  {/* About section glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-muted-foreground/80 to-muted-foreground mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full animate-pulse" />
                        <Shield className="h-6 w-6 text-white relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        About This Community
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div>
                      <h4 className="font-bold text-text mb-4">Community Description</h4>
                      <p className="text-lg text-muted whitespace-pre-line leading-relaxed">
                        {community?.description}
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-bold text-text mb-4">Community Settings</h4>
                        
                        <div className="relative flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50 mb-4 group/setting">
                          <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover/setting:opacity-100 transition-opacity duration-300 rounded-xl" />
                          <div className="flex items-center gap-4 relative z-10">
                            {community?.isPrivate ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-radial from-copper-600/30 via-transparent to-transparent rounded-full" />
                                <Lock className="h-6 w-6 text-copper-600 relative z-10" />
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full" />
                                <Globe className="h-6 w-6 text-glow relative z-10" />
                              </div>
                            )}
                            <span className="font-semibold text-text">Privacy Level</span>
                          </div>
                          <Badge className={`relative ${community?.isPrivate 
                            ? 'bg-gradient-to-r from-copper-600 to-copper-800' 
                            : 'bg-gradient-to-r from-glow/80 to-accent'
                          } ${community?.isPrivate ? 'text-white' : 'text-black'} border-0 shadow-soft px-3 py-1 z-10`}>
                            {community?.isPrivate ? 'Exclusive Private' : 'Open Public'}
                          </Badge>
                        </div>
                        
                        <div className="relative flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50 group/setting">
                          <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover/setting:opacity-100 transition-opacity duration-300 rounded-xl" />
                          <div className="flex items-center gap-4 relative z-10">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full" />
                              <Shield className="h-6 w-6 text-accent relative z-10" />
                            </div>
                            <span className="font-semibold text-text">Membership Policy</span>
                          </div>
                          <Badge className="relative bg-gradient-to-r from-copper-500 to-accent text-black border-0 shadow-soft capitalize px-3 py-1 z-10">
                            {community?.membershipPolicy?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-bold text-text mb-4">Premium Features</h4>
                        <div className="space-y-4">
                          {[
                            'Exclusive member discussions',
                            'Premium content access', 
                            'Priority event notifications',
                            'Direct organizer contact',
                            'Community networking'
                          ].map((feature, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 }}
                              className="flex items-center gap-4"
                            >
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full" />
                                <CheckCircle className="h-5 w-5 text-glow flex-shrink-0 relative z-10" />
                              </div>
                              <span className="text-text leading-relaxed font-medium">{feature}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          /* Premium Members-Only Gate */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden group rounded-2xl">
              {/* Premium firefly background */}
              <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/10" />
              <div className="absolute top-8 right-8 w-24 h-24 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full animate-pulse" />
              <div className="absolute bottom-12 left-12 w-32 h-32 bg-gradient-radial from-copper-500/15 via-transparent to-transparent rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
              
              <CardContent className="relative text-center py-16 px-8">
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-12">
                  <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
                  <Lock className="h-12 w-12 text-accent relative z-10" />
                </div>
                
                <h3 className="font-fraunces text-3xl md:text-4xl font-bold mb-6">
                  <span className="text-text">
                    {membership?.status === 'pending' ? 'Membership' : 'Premium Members'}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-copper-500 via-accent to-glow bg-clip-text text-transparent">
                    {membership?.status === 'pending' ? 'Pending' : 'Only'}
                  </span>
                </h3>
                
                <p className="text-lg text-muted mb-12 max-w-2xl mx-auto leading-relaxed">
                  {membership?.status === 'pending' 
                    ? 'Your membership request has been submitted and is awaiting approval from the community organizers. Like a firefly awaiting its turn to join the dance.'
                    : 'This exclusive community content is reserved for verified premium members. Join our luminous gathering to unlock access to member discussions, events, and exclusive content that sparkles with meaning.'
                  }
                </p>
                
                {membership?.status === 'pending' ? (
                  <div className="space-y-4">
                    <div className="relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-copper-400/20 to-accent/20 rounded-xl border border-accent/30">
                      <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                      <Clock className="h-6 w-6 text-accent relative z-10" />
                      <span className="font-bold text-accent relative z-10">
                        Approval in progress...
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      You'll receive a notification once your membership is approved, and your light will join our constellation.
                    </p>
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden"
                    onClick={() => joinCommunityMutation.mutate()}
                    disabled={joinCommunityMutation.isPending}
                    data-testid="request-join-button"
                  >
                    <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {joinCommunityMutation.isPending ? (
                      <Loader2 className="h-6 w-6 mr-2 animate-spin relative z-10" />
                    ) : (
                      <UserPlus className="h-6 w-6 mr-2 relative z-10" />
                    )}
                    <span className="relative z-10">
                      {joinCommunityMutation.isPending ? 'Submitting Request...' : 'Request Premium Access'}
                    </span>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}