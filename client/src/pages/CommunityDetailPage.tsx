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
  ArrowLeft
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

export default function CommunityDetailPage() {
  const [match, params] = useRoute("/communities/:id");
  const communityId = params?.id;
  
  const [activeTab, setActiveTab] = useState("posts");
  const { toast } = useToast();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Get community details with real API call
  const { data: communityData, isLoading, error } = useQuery({
    queryKey: ['/api/communities', communityId],
    enabled: !!communityId && !!user,
    retry: false,
  });

  // Join community mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/communities/${communityId}/join`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ title: "Membership request submitted!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId] });
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/10 dark:to-orange-900/10">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to view community details.
          </p>
          <Link href="/account/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/10 dark:to-orange-900/10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/10 dark:to-orange-900/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/community">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Communities
            </Button>
          </Link>
        </div>

        {/* Community Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {community.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mb-4">
                    {community.isPrivate ? (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {community.membershipPolicy.replace('_', ' ')}
                    </Badge>
                    {membership && (
                      <Badge 
                        variant={membership.status === 'approved' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {membership.status}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    {community.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {canManage && (
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  )}
                  {!membership && (
                    <Button data-testid="join-community-button">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Community
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Community Content */}
        {membership?.status === 'approved' || canManage ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  data-testid={`post-${post.id}`}
                >
                  <Card className={post.isPinned ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.isPinned && (
                              <Pin className="h-4 w-4 text-amber-600" />
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {post.postType}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="text-lg">{post.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {post.content}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Community Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>OR</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">Community Organizer</p>
                        <p className="text-sm text-gray-500">Owner</p>
                      </div>
                      <Badge>Owner</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About This Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {community.description}
                  </p>
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Privacy</span>
                      <span className="text-sm font-medium">
                        {community.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Membership Policy</span>
                      <span className="text-sm font-medium capitalize">
                        {community.membershipPolicy.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Members Only</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This community's content is only visible to approved members.
              </p>
              {membership?.status === 'pending' ? (
                <p className="text-amber-600 font-medium">
                  Your membership request is pending approval.
                </p>
              ) : (
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Request to Join
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}