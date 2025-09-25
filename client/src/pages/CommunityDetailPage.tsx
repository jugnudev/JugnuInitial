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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-6">
              <Crown className="h-8 w-8 text-amber-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Loading Premium Community
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-8">
              <Shield className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Premium Access Required
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              This exclusive community is reserved for authenticated premium members. 
              Sign in to unlock your premium community experience.
            </p>
            <Link href="/account/signin">
              <Button size="lg" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg" data-testid="signin-required-button">
                <Crown className="h-5 w-5 mr-2" />
                Sign In to Continue
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 mx-auto mb-8">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Community Not Found
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
              The community you're looking for doesn't exist or may have been removed.
            </p>
            <Link href="/communities">
              <Button size="lg" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg" data-testid="back-to-communities-button">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Communities
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Header skeleton */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-800 to-orange-800 rounded-lg animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-800 to-orange-800 rounded-lg animate-pulse" />
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-12 bg-white/40 dark:bg-slate-800/40 rounded-xl animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-white/40 dark:bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Premium Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link href="/communities">
            <Button variant="ghost" className="group hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-200" data-testid="back-to-communities">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Communities</span>
            </Button>
          </Link>
        </motion.div>

        {/* Premium Community Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 opacity-20 rounded-2xl p-[1px]">
            <div className="h-full w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl" />
          </div>
          
          <Card className="relative border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl mb-8 overflow-hidden">
            {/* Header background pattern */}
            <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-br from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-bl-[100px]" />
            
            <CardHeader className="relative pb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-amber-800 to-orange-800 dark:from-white dark:via-amber-200 dark:to-orange-200 bg-clip-text text-transparent mb-1">
                        {community.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Premium Community</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium badges */}
                  <div className="flex items-center gap-3 mb-6">
                    {community.isPrivate ? (
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                        <Lock className="h-3 w-3 mr-1" />
                        Exclusive Private
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
                        <Globe className="h-3 w-3 mr-1" />
                        Open Community
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300 capitalize font-medium">
                      <Shield className="h-3 w-3 mr-1" />
                      {community.membershipPolicy.replace('_', ' ')}
                    </Badge>
                    {membership && (
                      <Badge 
                        className={`${membership.status === 'approved' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : membership.status === 'pending'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        } border-0 shadow-lg capitalize font-medium`}
                      >
                        {membership.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {membership.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {membership.status}
                      </Badge>
                    )}
                  </div>
                  
                  <CardDescription className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    {community.description}
                  </CardDescription>
                </div>
                
                {/* Premium action buttons */}
                <div className="flex flex-col gap-3 ml-8">
                  {canManage && (
                    <Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-lg" data-testid="manage-community-button">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Community
                    </Button>
                  )}
                  {!membership && (
                    <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" data-testid="join-community-button">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Premium Community
                    </Button>
                  )}
                  {membership?.status === 'approved' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Premium Member</span>
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
              <TabsList className="grid w-full grid-cols-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-2 rounded-xl shadow-lg border-0">
                <TabsTrigger 
                  value="posts" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
                  data-testid="tab-posts"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
                  data-testid="tab-members"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger 
                  value="about" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200"
                  data-testid="tab-about"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  About
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
                      <Card className={`border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                        post.isPinned 
                          ? 'ring-2 ring-amber-200 dark:ring-amber-800 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20' 
                          : 'hover:ring-2 hover:ring-amber-200/50 dark:hover:ring-amber-800/50'
                      }`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                {post.isPinned && (
                                  <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-semibold shadow-lg">
                                    <Pin className="h-3 w-3" />
                                    Pinned
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
                              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                                {post.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      No posts yet
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Be the first to start a conversation in this premium community!
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-8">
                <Card className="border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-slate-900 dark:text-white">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 mr-3">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      Premium Members
                    </CardTitle>
                    <p className="text-slate-600 dark:text-slate-300 mt-2">
                      Connect with verified members of this exclusive community
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
                            className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-amber-50/30 dark:from-slate-800/50 dark:to-amber-900/10 hover:shadow-lg transition-all"
                          >
                            <Avatar className="h-12 w-12 ring-2 ring-amber-200 dark:ring-amber-800">
                              <AvatarFallback className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
                                OR
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 dark:text-white">Community Organizer</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Leading this premium community</p>
                            </div>
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-4">
                          <Users className="h-8 w-8 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          Building our community
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300">
                          More premium members will be shown here as they join
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about" className="mt-8">
                <Card className="border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-slate-900 dark:text-white">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 mr-3">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      About This Community
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Community Description</h4>
                      <p className="text-lg text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {community.description}
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Community Settings</h4>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-amber-50/30 dark:from-slate-800/50 dark:to-amber-900/10">
                          <div className="flex items-center gap-3">
                            {community.isPrivate ? (
                              <Lock className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Globe className="h-5 w-5 text-green-600" />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-300">Privacy Level</span>
                          </div>
                          <Badge className={`${community.isPrivate 
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                          } text-white border-0 shadow-lg`}>
                            {community.isPrivate ? 'Exclusive Private' : 'Open Public'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-amber-50/30 dark:from-slate-800/50 dark:to-amber-900/10">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-amber-600" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Membership Policy</span>
                          </div>
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg capitalize">
                            {community.membershipPolicy.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Premium Features</h4>
                        <div className="space-y-3">
                          {[
                            'Exclusive member discussions',
                            'Premium content access', 
                            'Priority event notifications',
                            'Direct organizer contact',
                            'Community networking'
                          ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                            </div>
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
            <Card className="border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl overflow-hidden">
              {/* Premium background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-orange-50/50 to-red-50/50 dark:from-amber-900/10 dark:via-orange-900/10 dark:to-red-900/10" />
              
              <CardContent className="relative text-center py-16 px-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-8">
                  <Lock className="h-10 w-10 text-amber-600" />
                </div>
                
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {membership?.status === 'pending' ? 'Membership Pending' : 'Premium Members Only'}
                </h3>
                
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
                  {membership?.status === 'pending' 
                    ? 'Your membership request has been submitted and is awaiting approval from the community organizers.'
                    : 'This exclusive community content is reserved for verified premium members. Join to unlock access to member discussions, events, and exclusive content.'
                  }
                </p>
                
                {membership?.status === 'pending' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                        Approval in progress...
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      You'll receive a notification once your membership is approved.
                    </p>
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => joinCommunityMutation.mutate()}
                    disabled={joinCommunityMutation.isPending}
                    data-testid="request-join-button"
                  >
                    {joinCommunityMutation.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5 mr-2" />
                    )}
                    {joinCommunityMutation.isPending ? 'Submitting Request...' : 'Request Premium Access'}
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