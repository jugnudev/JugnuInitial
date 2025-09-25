import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Heart, Plus, Lock, Globe, Crown, Star, Sparkles, Check, Zap, Calendar, Award } from "lucide-react";
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

export default function CommunitiesLandingPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'my' | 'discover'>('all');
  const { toast } = useToast();

  // Get current user
  const { data: authData, isLoading: userLoading } = useQuery<{ user?: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const user = authData?.user;

  // Get user's own community if they're an organizer
  const { data: userCommunity } = useQuery<Community>({
    queryKey: ['/api/organizers/community'],
    enabled: !!user && user.role === 'organizer',
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
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create community');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Community created successfully!" });
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
              Loading Your Premium Experience
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Premium Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 via-orange-500/10 to-red-500/10" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/10 via-orange-50/10 to-red-50/10 opacity-20" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 text-sm font-medium mb-8">
                <Crown className="h-4 w-4" />
                Premium Communities
                <Sparkles className="h-4 w-4" />
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-slate-900 via-amber-800 to-orange-800 dark:from-white dark:via-amber-200 dark:to-orange-200 bg-clip-text text-transparent mb-8 leading-tight">
                Elevate Your
                <br />
                <span className="relative">
                  <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Community</span>
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                  </motion.div>
                </span>
                <br />
                Experience
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join exclusive, curated communities where meaningful connections flourish. 
                <br className="hidden md:block" />
                Experience premium features designed for authentic community building.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Premium Pricing Section */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Choose Your
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Premium </span>
              Experience
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Unlock exclusive access to curated communities, premium features, and elevated networking opportunities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-300 hover:shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-4">
                    <Zap className="h-8 w-8 text-amber-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Monthly Access</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      $19<span className="text-lg font-normal text-slate-500">.99</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">per month</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      'Access to all premium communities',
                      'Priority member verification',
                      'Advanced networking tools',
                      'Exclusive events & experiences',
                      'Premium support'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/account/signup" className="block">
                    <Button className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3" data-testid="monthly-signup-button">
                      Start Monthly Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Annual Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  <Award className="h-4 w-4 inline mr-1" />
                  Most Popular
                </div>
              </div>
              
              <Card className="border-2 border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 hover:shadow-2xl relative overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10" />
                
                <CardHeader className="text-center pb-8 relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 mx-auto mb-4">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Annual Access</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      $199<span className="text-lg font-normal text-slate-500">.00</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">per year</p>
                    <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                      Save $40 yearly
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="space-y-3">
                    {[
                      'Everything in Monthly plan',
                      'Exclusive annual member perks',
                      'Priority community placement',
                      'Quarterly networking events',
                      'VIP concierge support',
                      '2 months completely FREE'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/account/signup" className="block">
                    <Button className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 shadow-lg" data-testid="annual-signup-button">
                      Start Annual Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center mt-16"
          >
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Already have an account?
            </p>
            <Link href="/account/signin">
              <Button variant="outline" size="lg" className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/20" data-testid="signin-button">
                Sign In to Your Communities
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }
  
  // Signed in users see community discovery
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Premium Header for Signed In Users */}
      <div className="bg-gradient-to-r from-slate-800 via-amber-900 to-orange-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-orange-100/20 to-red-100/20 opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-amber-200 text-sm font-medium mb-6">
              <Crown className="h-4 w-4" />
              Premium Member
              <Sparkles className="h-4 w-4" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Welcome to Your
              <br />
              <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                Exclusive Communities
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Discover, connect, and engage with premium communities curated for meaningful connections.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Premium Tab Navigation */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex space-x-1 mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-2 shadow-lg">
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
              selectedTab === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            data-testid="tab-all-communities"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            All Communities
          </button>
          <button
            onClick={() => setSelectedTab('my')}
            className={`flex-1 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
              selectedTab === 'my'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            data-testid="tab-my-communities"
          >
            <Heart className="h-4 w-4 inline mr-2" />
            My Communities
          </button>
          <button
            onClick={() => setSelectedTab('discover')}
            className={`flex-1 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
              selectedTab === 'discover'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            data-testid="tab-discover"
          >
            <Sparkles className="h-4 w-4 inline mr-2" />
            Discover
          </button>
        </div>
      </div>

      {/* Premium Communities Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communities.map((community: Community) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5 }}
              data-testid={`community-card-${community.id}`}
            >
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden relative">
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-[1px] rounded-lg">
                  <div className="h-full w-full bg-white dark:bg-slate-800 rounded-lg" />
                </div>
                
                <div className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                        <Users className="h-6 w-6 text-amber-600" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {community.isPrivate ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {community.name}
                    </CardTitle>
                    
                    <CardDescription className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {community.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-6">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1.5 text-amber-500" />
                        <span className="font-medium">{community.memberCount || 0}</span>
                        <span className="ml-1">members</span>
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1.5 text-amber-500" />
                        <span className="font-medium">{community.postCount || 0}</span>
                        <span className="ml-1">posts</span>
                      </div>
                    </div>
                    
                    <Link href={`/communities/${community.slug || community.id}`}>
                      <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" data-testid={`join-community-${community.id}`}>
                        <Crown className="h-4 w-4 mr-2" />
                        Enter Community
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
        <div className="text-center py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-amber-600" />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {selectedTab === 'discover' ? 'New Communities Coming Soon' : 'No Communities Yet'}
            </h3>
            
            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {selectedTab === 'discover' 
                ? 'We\'re curating exclusive communities for our premium members. Check back soon for exciting new connections!' 
                : 'Start your community journey by creating or joining premium communities tailored to your interests.'}
            </p>
            
            {user?.role === 'organizer' && selectedTab !== 'discover' && (
              <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl" data-testid="create-community-button">
                <Plus className="h-5 w-5 mr-2" />
                Create Premium Community
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}