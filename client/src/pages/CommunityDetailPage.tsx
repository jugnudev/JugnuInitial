import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Loader2,
  BarChart3,
  TrendingUp,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  Plus,
  Send,
  Heart,
  MessageCircle,
  Share,
  Building2
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";

interface Community {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  coverUrl?: string;
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
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  linkDescription?: string;
  tags?: string[];
  metadata?: any;
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

// Enhanced animation configurations for CommunityDetailPage
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
      delayChildren: 0.2
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

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { 
    duration: 0.5, 
    ease: "easeOut" 
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


export default function CommunityDetailPage() {
  const [match, params] = useRoute("/communities/:slug");
  const communitySlug = params?.slug;
  
  const [activeTab, setActiveTab] = useState("announcements");
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
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

  // Get community analytics data
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery<{ analytics: { totalMembers: number, totalPosts: number, engagementRate: string, totalViews: string, recentGrowth: string, lastUpdated: string } }>({
    queryKey: ['/api/communities', communityData?.community?.id, 'analytics'],
    enabled: !!communitySlug && !!user && !!communityData?.community?.id,
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

  // Cover Image Upload Mutation
  const uploadCoverImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      
      const formData = new FormData();
      formData.append('image', file);
      
      // Get auth token from localStorage for authentication
      const authToken = localStorage.getItem('community_auth_token');
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`/api/communities/${community.id}/upload-cover-image`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload cover image');
      }
      
      const data = await response.json();
      const { coverUrl } = data;
      if (!coverUrl) {
        throw new Error('Invalid response: missing coverUrl');
      }
      return coverUrl;
    },
    onSuccess: (data) => {
      toast({ title: "Cover image updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload cover image", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // ============ ORGANIZER CONSOLE MUTATIONS ============

  // Create Announcement Mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: { title: string; content: string; imageUrl?: string; postType?: string; isPinned?: boolean }) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const data = await apiRequest('POST', `/api/communities/${community.id}/posts`, announcementData);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Announcement created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
      setShowCreateAnnouncement(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create announcement", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update Announcement Mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: { title: string; content: string; imageUrl?: string; postType?: string; isPinned?: boolean } }) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const updateData = await apiRequest('PUT', `/api/communities/${community.id}/posts/${postId}`, data);
      return updateData;
    },
    onSuccess: () => {
      toast({ title: "Announcement updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
      setEditingPostId(null);
      setEditPostForm({
        title: '',
        content: '',
        imageUrl: '',
        postType: 'announcement',
        isPinned: false
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update announcement", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete Announcement Mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const data = await apiRequest('DELETE', `/api/communities/${community.id}/posts/${postId}`);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Announcement deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete announcement", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Approve Member Mutation
  const approveMemberMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'approve' | 'decline' }) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const data = await apiRequest('POST', `/api/communities/${community.id}/members/${userId}/manage`, { action });
      return data;
    },
    onSuccess: (data, variables) => {
      toast({ 
        title: `Member ${variables.action === 'approve' ? 'approved' : 'declined'} successfully!` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to manage member", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update Community Settings Mutation
  const updateCommunityMutation = useMutation({
    mutationFn: async (communityData: { name?: string; description?: string; isPrivate?: boolean; membershipPolicy?: string }) => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const data = await apiRequest('PUT', `/api/communities/${community.id}`, communityData);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Community settings updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update community settings", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete Community Mutation
  const deleteCommunityMutation = useMutation({
    mutationFn: async () => {
      if (!community?.id) {
        throw new Error('Community ID not available');
      }
      const data = await apiRequest('DELETE', `/api/communities/${community.id}`);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Community deleted successfully!" });
      // Redirect to communities landing page
      window.location.href = '/communities';
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Organizer-only state for console features
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    postType: 'announcement' as 'announcement' | 'update' | 'event',
    isPinned: false
  });
  
  // Edit announcement state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostForm, setEditPostForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    postType: 'announcement' as 'announcement' | 'update' | 'event',
    isPinned: false
  });
  
  // Settings editing state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    membershipPolicy: 'approval_required' as 'open' | 'approval_required' | 'closed'
  });
  

  // Handle form submissions
  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    createAnnouncementMutation.mutate(announcementForm);
  };

  const handleDeleteAnnouncement = (postId: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      deleteAnnouncementMutation.mutate(postId);
    }
  };
  
  const handleEditAnnouncement = (post: Post) => {
    setEditingPostId(post.id);
    setEditPostForm({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || '',
      postType: post.postType,
      isPinned: post.isPinned
    });
  };
  
  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditPostForm({
      title: '',
      content: '',
      imageUrl: '',
      postType: 'announcement',
      isPinned: false
    });
  };
  
  const handleSaveEdit = () => {
    if (!editPostForm.title.trim() || !editPostForm.content.trim()) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (editingPostId) {
      updateAnnouncementMutation.mutate({
        postId: editingPostId,
        data: editPostForm
      });
    }
  };

  const handleApproveMember = (userId: string) => {
    approveMemberMutation.mutate({ userId, action: 'approve' });
  };

  const handleRejectMember = (userId: string) => {
    approveMemberMutation.mutate({ userId, action: 'decline' });
  };
  
  const handleEditInfo = () => {
    setIsEditingInfo(true);
  };
  
  const handleSaveInfo = () => {
    updateCommunityMutation.mutate({
      name: editForm.name,
      description: editForm.description
    });
    setIsEditingInfo(false);
  };
  
  const handleCancelInfo = () => {
    if (community) {
      setEditForm(prev => ({
        ...prev,
        name: community.name || '',
        description: community.description || ''
      }));
    }
    setIsEditingInfo(false);
  };
  
  const handleEditPrivacy = () => {
    setIsEditingPrivacy(true);
  };
  
  const handleSavePrivacy = () => {
    updateCommunityMutation.mutate({
      isPrivate: editForm.isPrivate,
      membershipPolicy: editForm.membershipPolicy
    });
    setIsEditingPrivacy(false);
  };
  
  const handleCancelPrivacy = () => {
    if (community) {
      setEditForm(prev => ({
        ...prev,
        isPrivate: community.isPrivate || false,
        membershipPolicy: community.membershipPolicy || 'approval_required'
      }));
    }
    setIsEditingPrivacy(false);
  };

  const community = communityData?.community;
  const membership = communityData?.membership;
  const posts = communityData?.posts || [];
  const members = communityData?.members || [];
  const canManage = communityData?.canManage || false;
  const isOwner = membership?.role === 'owner' || false;
  
  // Initialize edit form when community data loads
  useEffect(() => {
    if (community) {
      setEditForm({
        name: community.name || '',
        description: community.description || '',
        isPrivate: community.isPrivate || false,
        membershipPolicy: community.membershipPolicy || 'approval_required'
      });
    }
  }, [community]);

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
                Community
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
              This exclusive community is reserved for authenticated members like fireflies gathering in their special place. 
              Sign in to unlock your community experience.
            </p>
            <Link href="/account/signin">
              <MotionButton 
                size="lg" 
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="signin-required-button"
                variants={buttonPress}
                whileHover="whileHover"
                whileTap="whileTap"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <Crown className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">Sign In to Continue</span>
              </MotionButton>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Community not found page
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
              <MotionButton 
                size="lg" 
                className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                data-testid="back-to-communities-button"
                variants={buttonPress}
                whileHover="whileHover"
                whileTap="whileTap"
              >
                <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <ArrowLeft className="h-6 w-6 mr-2 relative z-10" />
                <span className="relative z-10">Back to Communities</span>
              </MotionButton>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading state for community data
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

        {/* Community Header */}
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
            {/* Cover Image Section */}
            {isOwner && (
              <div className="relative h-48 bg-gradient-to-br from-copper-500/20 via-accent/20 to-glow/20 border-b border-border/50">
                <ObjectUploader
                  onUpload={(file) => uploadCoverImageMutation.mutateAsync(file)}
                  placeholder="Drop cover image here or click to upload"
                  existingUrl={community?.coverUrl}
                  onRemove={() => {
                    // Add remove cover image functionality if needed
                  }}
                  className="h-full"
                  data-testid="community-cover-uploader"
                />
                {uploadCoverImageMutation.isPending && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            )}
            
            {/* Cover Image Display (for non-owners) */}
            {!isOwner && community?.coverUrl && (
              <div className="relative h-48 bg-gradient-to-br from-copper-500/20 via-accent/20 to-glow/20 border-b border-border/50">
                <img
                  src={community.coverUrl}
                  alt={`${community.name} cover`}
                  className="w-full h-full object-cover"
                  data-testid="community-cover-image"
                />
              </div>
            )}
            
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
                        <span className="text-sm font-semibold text-accent">Community</span>
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
                  </div>
                  
                  <CardDescription className="text-lg text-muted leading-relaxed">
                    {community?.description}
                  </CardDescription>
                </div>
                
                {/* Premium action buttons */}
                <div className="flex flex-col gap-4 ml-8">
                  {canManage && (
                    <MotionButton 
                      className="relative bg-gradient-to-r from-muted-foreground/80 to-muted-foreground hover:from-muted-foreground hover:to-foreground text-white font-bold px-6 py-3 rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 group overflow-hidden" 
                      data-testid="manage-community-button"
                      onClick={() => setActiveTab('settings')}
                      variants={buttonPress}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <Settings className="h-5 w-5 mr-2 relative z-10" />
                      <span className="relative z-10">Manage Community</span>
                    </MotionButton>
                  )}
                  {!membership && (
                    <MotionButton 
                      className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden" 
                      data-testid="join-community-button"
                      variants={buttonPress}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <UserPlus className="h-5 w-5 mr-2 relative z-10" />
                      <span className="relative z-10">Join Community</span>
                    </MotionButton>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Community Content - Visible to approved members and organizers */}
        {membership?.status === 'approved' || isOwner ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Organizer Console - Only visible when user is owner */}
            {isOwner && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="relative grid w-full grid-cols-4 bg-card/80 backdrop-blur-sm p-2 rounded-2xl shadow-large border border-border">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-accent/5 to-glow/5 rounded-2xl" />
                
                <TabsTrigger 
                  value="announcements" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-announcements"
                >
                  {activeTab === 'announcements' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <MessageSquare className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">Announcements</span>
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
                  value="analytics" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-analytics"
                >
                  {activeTab === 'analytics' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <BarChart3 className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">Analytics</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-glow font-bold transition-all duration-300 data-[state=inactive]:text-muted data-[state=inactive]:hover:text-accent data-[state=inactive]:hover:bg-copper-500/10 rounded-xl"
                  data-testid="tab-settings"
                >
                  {activeTab === 'settings' && (
                    <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-xl" />
                  )}
                  <Settings className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Announcements Tab - Enhanced with Create Functionality */}
              <TabsContent value="announcements" className="space-y-6 mt-8">
                {/* Create Announcement Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setShowCreateAnnouncement(true)}
                    className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden"
                    data-testid="create-announcement-button"
                  >
                    <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <Plus className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">New Announcement</span>
                  </Button>
                </div>

                {posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post: Post, index) => (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        data-testid={`post-${post.id}`}
                        className={`group border-b border-border/30 pb-4 last:border-b-0 ${
                          post.isPinned ? 'bg-accent/5 -mx-4 px-4 py-4 rounded-lg border border-accent/20' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Community Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-copper-500/20 to-accent/20 border border-copper-500/30 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-copper-500" />
                            </div>
                          </div>

                          {/* Post Content */}
                          <div className="flex-1 min-w-0">
                            {/* Post Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-text text-sm">
                                  {community?.name}
                                </h4>
                                {post.isPinned && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium">
                                    <Pin className="h-3 w-3" />
                                    <span>Pinned</span>
                                  </div>
                                )}
                                <Badge 
                                  variant="secondary" 
                                  className={`capitalize text-xs ${
                                    post.postType === 'announcement' 
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : post.postType === 'event'
                                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                                  }`}
                                >
                                  {post.postType}
                                </Badge>
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  <Clock className="h-3 w-3" />
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {/* Action Buttons - Only for owners */}
                              {isOwner && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 hover:bg-accent/20 text-muted hover:text-accent"
                                    onClick={() => handleEditAnnouncement(post)}
                                    data-testid={`edit-post-${post.id}`}
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 hover:bg-destructive/20 text-muted hover:text-destructive"
                                    onClick={() => handleDeleteAnnouncement(post.id)}
                                    disabled={deleteAnnouncementMutation.isPending}
                                    data-testid={`delete-post-${post.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Post Title */}
                            <h3 className="font-semibold text-lg text-text mb-2 leading-tight">
                              {post.title}
                            </h3>

                            {/* Post Content */}
                            <p className="text-muted leading-relaxed text-sm whitespace-pre-line mb-3">
                              {post.content}
                            </p>

                            {/* Post Image */}
                            {post.imageUrl && (
                              <div className="mb-3">
                                <img
                                  src={post.imageUrl}
                                  alt=""
                                  className="w-full max-h-80 object-cover rounded-lg border border-border"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {/* Post Actions/Engagement (placeholder for future) */}
                            <div className="flex items-center gap-4 text-xs text-muted pt-2">
                              <button 
                                className="flex items-center gap-1 hover:text-accent transition-colors"
                                onClick={() => {
                                  toast({
                                    title: "Like Post",
                                    description: "Post interactions are coming soon! Stay tuned for likes, reactions, and more.",
                                    duration: 3000,
                                  });
                                }}
                                data-testid="like-announcement-button"
                              >
                                <Heart className="h-3 w-3" />
                                <span>Like</span>
                              </button>
                              <button 
                                className="flex items-center gap-1 hover:text-accent transition-colors"
                                onClick={() => {
                                  toast({
                                    title: "Comments",
                                    description: "Comment functionality is coming soon! You'll be able to engage with community announcements.",
                                    duration: 3000,
                                  });
                                }}
                                data-testid="comment-announcement-button"
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span>Comment</span>
                              </button>
                              <button 
                                className="flex items-center gap-1 hover:text-accent transition-colors"
                                onClick={() => {
                                  toast({
                                    title: "Share Post",
                                    description: "Sharing functionality is coming soon! You'll be able to share announcements with others.",
                                    duration: 3000,
                                  });
                                }}
                                data-testid="share-announcement-button"
                              >
                                <Share className="h-3 w-3" />
                                <span>Share</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
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
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">No announcements yet</span>
                    </h3>
                    <p className="text-muted leading-relaxed mb-6">
                      Create your first announcement to keep your community informed and engaged!
                    </p>
                    <Button 
                      onClick={() => setShowCreateAnnouncement(true)}
                      className="relative bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group overflow-hidden"
                      data-testid="create-first-announcement-button"
                    >
                      <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <Plus className="h-5 w-5 mr-2 relative z-10" />
                      <span className="relative z-10">Create First Announcement</span>
                    </Button>
                  </motion.div>
                )}
              </TabsContent>

              {/* Members Tab - Enhanced with Management Features */}
              <TabsContent value="members" className="mt-8 space-y-6">
                {/* Members Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mx-auto mb-4">
                        <Users className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-2xl font-bold text-text">{members.length}</div>
                      <div className="text-sm text-muted">Total Members</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-glow/5 to-copper-500/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-accent to-glow mx-auto mb-4">
                        <Clock className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-2xl font-bold text-text">
                        {members.filter(m => m.status === 'pending').length}
                      </div>
                      <div className="text-sm text-muted">Pending Requests</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-glow/5 via-copper-500/5 to-accent/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-glow to-copper-500 mx-auto mb-4">
                        <TrendingUp className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-2xl font-bold text-text">+5</div>
                      <div className="text-sm text-muted">This Month</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Members List with Management */}
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                        <Users className="h-6 w-6 text-black relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        Manage Members
                      </span>
                    </CardTitle>
                    <p className="text-muted mt-3 leading-relaxed">
                      Approve new members and manage your community.
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
                            <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover/member:opacity-100 transition-opacity duration-300 rounded-xl" />
                            
                            <Avatar className="relative h-14 w-14 ring-2 ring-accent/50 group-hover/member:ring-accent transition-colors">
                              {member.user?.profileImageUrl ? (
                                <AvatarImage 
                                  src={member.user.profileImageUrl} 
                                  alt={member.user?.firstName && member.user?.lastName 
                                    ? `${member.user.firstName} ${member.user.lastName}`
                                    : member.user?.email || 'Member'}
                                />
                              ) : null}
                              <AvatarFallback className="bg-gradient-to-r from-copper-500 to-accent text-black font-bold text-lg relative z-10">
                                {member.user?.firstName && member.user?.lastName 
                                  ? `${member.user.firstName.charAt(0)}${member.user.lastName.charAt(0)}`.toUpperCase()
                                  : member.user?.email 
                                  ? member.user.email.charAt(0).toUpperCase() + member.user.email.charAt(1).toUpperCase()
                                  : member.role === 'owner' ? 'OR' : 'MB'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 relative z-10">
                              <p className="font-bold text-text group-hover/member:text-accent transition-colors">
                                {member.user?.firstName && member.user?.lastName 
                                  ? `${member.user.firstName} ${member.user.lastName}`
                                  : member.user?.email || `${member.role === 'owner' ? 'Community Owner' : 'Member'} (ID: ${member.userId?.slice(0, 8)})`}
                              </p>
                              <p className="text-sm text-muted">
                                {member.user?.email && (
                                  <span className="block text-muted-foreground">{member.user.email}</span>
                                )}
                                <span className="text-xs">
                                  {member.status === 'pending' ? 'Awaiting approval' : 
                                   member.role === 'owner' ? 'Community Owner' : 'Active member'} •{' '}
                                  Joined {new Date(member.createdAt).toLocaleDateString()}
                                </span>
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={`relative border-0 shadow-soft px-3 py-1 ${
                                member.role === 'owner' 
                                  ? 'bg-gradient-to-r from-copper-600 to-copper-800 text-white'
                                  : member.status === 'pending'
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              }`}>
                                {member.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                                {member.role === 'owner' ? 'Owner' : member.status === 'pending' ? 'Pending' : 'Member'}
                              </Badge>
                              
                              {member.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="h-8 px-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                    onClick={() => handleApproveMember(member.userId)}
                                    disabled={approveMemberMutation.isPending}
                                    data-testid={`approve-member-${index}`}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-3"
                                    onClick={() => handleRejectMember(member.userId)}
                                    disabled={approveMemberMutation.isPending}
                                    data-testid={`reject-member-${index}`}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
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
                          <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">No members yet</span>
                        </h3>
                        <p className="text-muted leading-relaxed">
                          Your community is ready for members to join and create meaningful connections.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab - New Analytics Dashboard */}
              <TabsContent value="analytics" className="mt-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Key Metrics Cards */}
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mx-auto mb-4">
                        <Users className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-3xl font-bold text-text mb-2">{members.length}</div>
                      <div className="text-sm text-muted">Total Members</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-glow/5 to-copper-500/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-accent to-glow mx-auto mb-4">
                        <MessageSquare className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-3xl font-bold text-text mb-2">{posts.length}</div>
                      <div className="text-sm text-muted">Announcements</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-glow/5 via-copper-500/5 to-accent/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-glow to-copper-500 mx-auto mb-4">
                        <TrendingUp className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-3xl font-bold text-text mb-2">
                        {analyticsLoading ? (
                          <div className="h-8 w-16 bg-muted/30 animate-pulse rounded" />
                        ) : analyticsError ? (
                          <span className="text-destructive">--</span>
                        ) : (
                          analyticsData?.analytics?.engagementRate || '0%'
                        )}
                      </div>
                      <div className="text-sm text-muted">Engagement Rate</div>
                      <div className="text-xs text-accent mt-1">
                        {analyticsError ? 'Error loading data' : 'Real-time data'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-glow/5 to-accent/5" />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 via-accent to-glow mx-auto mb-4">
                        <BarChart3 className="h-6 w-6 text-black" />
                      </div>
                      <div className="text-3xl font-bold text-text mb-2">
                        {analyticsLoading ? (
                          <div className="h-8 w-16 bg-muted/30 animate-pulse rounded" />
                        ) : analyticsError ? (
                          <span className="text-destructive">--</span>
                        ) : (
                          analyticsData?.analytics?.totalViews || '0'
                        )}
                      </div>
                      <div className="text-sm text-muted">Total Views</div>
                      <div className="text-xs text-accent mt-1">
                        {analyticsLoading ? (
                          <div className="h-4 w-12 bg-muted/30 animate-pulse rounded" />
                        ) : analyticsError ? (
                          'Error loading data'
                        ) : (
                          `${analyticsData?.analytics?.recentGrowth || '+0%'} growth`
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analytics Charts Section */}
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                        <BarChart3 className="h-6 w-6 text-black relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        Community Analytics
                      </span>
                    </CardTitle>
                    <p className="text-muted mt-3 leading-relaxed">
                      Track your community growth and engagement like fireflies illuminating the night.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-6">
                        <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                        <BarChart3 className="h-10 w-10 text-accent relative z-10" />
                      </div>
                      <h3 className="font-fraunces text-2xl font-bold text-text mb-4">
                        <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">Analytics Dashboard</span>
                      </h3>
                      <p className="text-muted leading-relaxed">
                        Detailed charts and insights coming soon to help you understand your community better.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Community Settings Tab - Enhanced Management */}
              <TabsContent value="settings" className="mt-8 space-y-6">
                {/* Community Edit Form */}
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                        <Settings className="h-6 w-6 text-black relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        Community Settings
                      </span>
                    </CardTitle>
                    <p className="text-muted mt-3 leading-relaxed">
                      Manage your community settings and customize the experience for your members.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h4 className="font-bold text-text text-lg flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-accent" />
                        Basic Information
                      </h4>
                      
                      <div className="grid gap-6">
                        <div>
                          <Label className="text-sm font-medium text-text mb-2 block">Community Name</Label>
                          {isEditingInfo ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-background border-border text-text"
                              placeholder="Enter community name"
                            />
                          ) : (
                            <div className="relative p-4 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50">
                              <div className="font-semibold text-text">{community?.name}</div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-text mb-2 block">Description</Label>
                          {isEditingInfo ? (
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                              className="bg-background border-border text-text resize-none"
                              rows={4}
                              placeholder="Enter community description"
                            />
                          ) : (
                            <div className="relative p-4 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50">
                              <div className="text-muted leading-relaxed">{community?.description}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isEditingInfo ? (
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleSaveInfo}
                            disabled={updateCommunityMutation.isPending}
                            className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300"
                            data-testid="save-community-info-button"
                          >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {updateCommunityMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button 
                            onClick={handleCancelInfo}
                            variant="outline"
                            className="border-border text-text hover:bg-accent/10"
                            data-testid="cancel-edit-info-button"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleEditInfo}
                          className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300"
                          data-testid="edit-community-info-button"
                        >
                          <Edit3 className="h-5 w-5 mr-2" />
                          <span>Edit Information</span>
                        </Button>
                      )}
                    </div>

                    {/* Privacy & Access Settings */}
                    <div className="space-y-6">
                      <h4 className="font-bold text-text text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-accent" />
                        Privacy & Access
                      </h4>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50">
                          <div className="flex items-center gap-4">
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
                            <div>
                              <div className="font-semibold text-text">Privacy Level</div>
                              <div className="text-sm text-muted">
                                {community?.isPrivate ? 'Only invited members can join' : 'Community is publicly discoverable'}
                              </div>
                            </div>
                          </div>
                          <Badge className={`relative ${community?.isPrivate 
                            ? 'bg-gradient-to-r from-copper-600 to-copper-800' 
                            : 'bg-gradient-to-r from-glow/80 to-accent'
                          } ${community?.isPrivate ? 'text-white' : 'text-black'} border-0 shadow-soft px-4 py-2 z-10 font-bold`}>
                            {community?.isPrivate ? 'Private' : 'Public'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-card/80 to-accent/5 border border-border/50">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full" />
                              <UserPlus className="h-6 w-6 text-accent relative z-10" />
                            </div>
                            <div>
                              <div className="font-semibold text-text">Membership Policy</div>
                              <div className="text-sm text-muted">How new members join your community</div>
                            </div>
                          </div>
                          <Badge className="relative bg-gradient-to-r from-copper-500 to-accent text-black border-0 shadow-soft capitalize px-4 py-2 z-10 font-bold">
                            {community?.membershipPolicy?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button 
                        className="bg-gradient-to-r from-accent to-glow hover:from-glow hover:to-accent text-black font-bold px-6 py-3 rounded-xl shadow-glow hover:shadow-glow-strong transition-all duration-300"
                        data-testid="edit-privacy-settings-button"
                        onClick={() => {
                          toast({
                            title: "Privacy Settings",
                            description: "Privacy settings functionality is coming soon! Currently you can manage visibility via the membership policy settings above.",
                            duration: 4000,
                          });
                        }}
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        <span>Update Privacy Settings</span>
                      </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="space-y-6 pt-8 border-t border-destructive/20">
                      <h4 className="font-bold text-destructive text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Danger Zone
                      </h4>
                      <div className="p-6 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-text mb-2">Delete Community</h5>
                            <p className="text-muted text-sm leading-relaxed">
                              Permanently delete this community and all its content. This action cannot be undone and will remove all member access.
                            </p>
                          </div>
                          <Button 
                            variant="destructive"
                            className="ml-4 font-bold px-6 py-3 hover:shadow-lg"
                            onClick={() => {
                              if (confirm("Are you sure you want to permanently delete this community? This action cannot be undone.")) {
                                deleteCommunityMutation.mutate();
                              }
                            }}
                            disabled={deleteCommunityMutation.isPending}
                            data-testid="delete-community-button"
                          >
                            <Trash2 className="h-5 w-5 mr-2" />
                            {deleteCommunityMutation.isPending ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            )}

            {/* Member Content - Always visible to approved members and organizers */}
            {!canManage && (
              <div className="mt-8">
                <Card className="relative border border-border bg-card/90 backdrop-blur-sm shadow-large group overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-accent/5 to-glow/5" />
                  
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-text">
                      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-copper-500 to-accent mr-4">
                        <div className="absolute inset-0 bg-gradient-radial from-glow/40 via-transparent to-transparent rounded-full animate-pulse" />
                        <MessageSquare className="h-6 w-6 text-black relative z-10" />
                      </div>
                      <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent font-fraunces">
                        Community Posts
                      </span>
                    </CardTitle>
                    <p className="text-muted mt-3 leading-relaxed">
                      Stay connected with your community updates and announcements.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {posts.length > 0 ? (
                      <div className="space-y-6">
                        {posts.map((post: Post, index) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            data-testid={`member-post-${post.id}`}
                            className="group"
                          >
                            <Card className={`relative border border-border bg-card/90 backdrop-blur-sm shadow-large hover:shadow-glow-strong transition-all duration-500 overflow-hidden group rounded-2xl ${
                              post.isPinned 
                                ? 'ring-2 ring-accent/50 bg-gradient-to-br from-accent/10 via-copper-500/5 to-glow/10' 
                                : 'hover:ring-2 hover:ring-copper-500/30'
                            }`}>
                              <div className="absolute inset-0 bg-gradient-radial from-copper-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
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
                                {post.imageUrl && (
                                  <div className="mt-4">
                                    <img
                                      src={post.imageUrl}
                                      alt=""
                                      className="w-full max-h-96 object-cover rounded-xl border border-border shadow-soft"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-copper-500/30 bg-copper-500/10 mx-auto mb-6">
                          <div className="absolute inset-0 bg-gradient-radial from-accent/30 via-transparent to-transparent rounded-full animate-pulse" />
                          <MessageSquare className="h-10 w-10 text-accent relative z-10" />
                        </div>
                        <h3 className="font-fraunces text-2xl font-bold text-text mb-4">
                          <span className="bg-gradient-to-r from-copper-500 to-accent bg-clip-text text-transparent">No posts yet</span>
                        </h3>
                        <p className="text-muted leading-relaxed">
                          Your community organizer will share updates and announcements here soon!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
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
                    : 'This exclusive community content is reserved for verified members. Join our luminous gathering to unlock access to member discussions, events, and exclusive content that sparkles with meaning.'
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
                    <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    {joinCommunityMutation.isPending ? (
                      <Loader2 className="h-6 w-6 mr-2 animate-spin relative z-10" />
                    ) : (
                      <UserPlus className="h-6 w-6 mr-2 relative z-10" />
                    )}
                    <span className="relative z-10">
                      {joinCommunityMutation.isPending ? 'Submitting Request...' : 'Request Access'}
                    </span>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Create Announcement Dialog */}
        {showCreateAnnouncement && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl shadow-large max-w-md w-full p-6"
            >
              <h3 className="text-xl font-bold text-text mb-6 font-fraunces">
                Create New Announcement
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Title</label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter announcement title..."
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Content</label>
                  <textarea
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Write your announcement..."
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Image (Optional)</label>
                  <input
                    type="url"
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                    value={announcementForm.imageUrl}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    data-testid="input-announcement-image"
                  />
                  {announcementForm.imageUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-muted mb-2">Image Preview:</p>
                      <img
                        src={announcementForm.imageUrl}
                        alt="Preview"
                        className="max-w-full h-32 object-cover rounded-lg border border-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    className="rounded border-border"
                    checked={announcementForm.isPinned}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, isPinned: e.target.checked }))}
                  />
                  <label htmlFor="pinned" className="text-sm text-text">Pin this announcement</label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateAnnouncement(false);
                    setAnnouncementForm({ title: '', content: '', imageUrl: '', postType: 'announcement', isPinned: false });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={createAnnouncementMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold"
                >
                  {createAnnouncementMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Announcement Dialog */}
        {editingPostId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl shadow-large max-w-md w-full p-6"
            >
              <h3 className="text-xl font-bold text-text mb-6 font-fraunces">
                Edit Announcement
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Title</label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter announcement title..."
                    value={editPostForm.title}
                    onChange={(e) => setEditPostForm(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-title"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Content</label>
                  <textarea
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Write your announcement..."
                    value={editPostForm.content}
                    onChange={(e) => setEditPostForm(prev => ({ ...prev, content: e.target.value }))}
                    data-testid="textarea-content"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">Image (Optional)</label>
                  <input
                    type="url"
                    className="w-full p-3 rounded-xl bg-background border border-border text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                    value={editPostForm.imageUrl}
                    onChange={(e) => setEditPostForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    data-testid="input-edit-image"
                  />
                  {editPostForm.imageUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-muted mb-2">Image Preview:</p>
                      <img
                        src={editPostForm.imageUrl}
                        alt="Preview"
                        className="max-w-full h-32 object-cover rounded-lg border border-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-pinned"
                    className="rounded border-border"
                    checked={editPostForm.isPinned}
                    onChange={(e) => setEditPostForm(prev => ({ ...prev, isPinned: e.target.checked }))}
                  />
                  <label htmlFor="edit-pinned" className="text-sm text-text">Pin this announcement</label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateAnnouncementMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold"
                  data-testid="update-button"
                >
                  {updateAnnouncementMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}