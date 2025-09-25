import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Heart, Plus, Lock, Globe } from "lucide-react";
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

export default function CommunitiesLandingPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'my' | 'discover'>('all');
  const { toast } = useToast();

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Get user's own community if they're an organizer
  const { data: userCommunity } = useQuery({
    queryKey: ['/api/organizers/community'],
    enabled: !!user && user.role === 'organizer',
    retry: false,
  });

  // Get user's memberships
  const { data: userMemberships } = useQuery({
    queryKey: ['/api/user/memberships'],
    enabled: !!user,
    retry: false,
  });

  // Create community mutation
  const createCommunityMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPrivate?: boolean; membershipPolicy?: string }) => {
      return apiRequest('/api/communities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/10 dark:to-orange-900/10">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join Exclusive Communities
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-amber-100">
              Connect with like-minded people, share experiences, and build meaningful relationships
            </p>
            {user ? (
              user.role === 'organizer' ? (
                <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your Community
                </Button>
              ) : (
                <Link href="/account/apply-organizer">
                  <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50">
                    Become an Organizer
                  </Button>
                </Link>
              )
            ) : (
              <Link href="/account/signin">
                <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50">
                  Sign In to Join Communities
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Tab Navigation */}
        <div className="flex space-x-6 mb-8 border-b">
          <button
            onClick={() => setSelectedTab('all')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              selectedTab === 'all'
                ? 'border-amber-500 text-amber-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-amber-600'
            }`}
          >
            All Communities
          </button>
          {user && (
            <button
              onClick={() => setSelectedTab('my')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'my'
                  ? 'border-amber-500 text-amber-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-amber-600'
              }`}
            >
              My Communities
            </button>
          )}
          <button
            onClick={() => setSelectedTab('discover')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              selectedTab === 'discover'
                ? 'border-amber-500 text-amber-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-amber-600'
            }`}
          >
            Discover
          </button>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCommunities.map((community) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              data-testid={`community-card-${community.id}`}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {community.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-3">
                        {community.isPrivate ? (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {community.membershipPolicy.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {community.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {community.memberCount} members
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {community.postCount} posts
                    </div>
                  </div>
                  <Link href={`/communities/${community.id}`}>
                    <Button className="w-full" data-testid={`join-community-${community.id}`}>
                      View Community
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {mockCommunities.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No communities found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Be the first to create a community and start building connections!
            </p>
            {user?.role === 'organizer' && (
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Create Community
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}