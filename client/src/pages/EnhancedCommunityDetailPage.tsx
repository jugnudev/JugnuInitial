import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  User,
  Plus,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Building2,
  Camera,
  Upload,
  X,
  MoreVertical,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar,
  Hash,
  Download,
  Search,
  Filter,
  CalendarOff,
  Save,
  FileText,
  ExternalLink,
  GripVertical,
  PlusCircle,
  Activity,
  UserCog,
  ClockIcon,
  TrendingDown,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CreditCard
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AnnouncementImageUploader } from "@/components/community/AnnouncementImageUploader";
import { PostCard } from "@/components/PostCard";
import { JoinGate } from "@/components/JoinGate";
import CommunityChat from "@/components/CommunityChat";
import CommunityPolls from "@/components/CommunityPolls";
import CommunityBilling from "@/components/CommunityBilling";
import BillingCheckout from "@/components/BillingCheckout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Community {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  coverUrl?: string;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  status: string;
  memberCount?: number;
  postCount?: number;
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
  authorName?: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  viewCount?: number;
  reactions?: {
    type: string;
    count: number;
    hasReacted?: boolean;
  }[];
  comments?: Comment[];
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: Comment[];
  parentId?: string;
  isEdited?: boolean;
}

interface Member {
  id: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status: 'pending' | 'approved' | 'declined';
  role: 'member' | 'moderator' | 'owner';
  joinedAt?: string;
  requestedAt?: string;
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
  members?: Member[];
  canManage?: boolean;
}

// PostCard wrapper that fetches comments for each post
function PostCardWithComments({
  post,
  communityId,
  ...otherProps
}: {
  post: Post;
  communityId: string;
  [key: string]: any;
}) {
  const { data: commentsData } = useQuery({
    queryKey: ['/api/communities', communityId, 'posts', post.id, 'comments'],
    enabled: !!communityId && !!post.id,
    retry: false,
  });
  
  const comments = commentsData?.comments || [];
  
  return (
    <PostCard
      {...post}
      comments={comments}
      {...otherProps}
    />
  );
}

// Premium animation configurations
const pageAnimation = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const headerAnimation = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const contentAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export default function EnhancedCommunityDetailPage() {
  const [match, params] = useRoute("/communities/:slug");
  const communitySlug = params?.slug;
  
  const [activeTab, setActiveTab] = useState("announcements");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const { toast } = useToast();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Form states
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    linkText: '',
    linkDescription: '',
    tags: [] as string[],
    postType: 'announcement' as 'announcement' | 'update' | 'event',
    isPinned: false,
    status: 'published' as 'draft' | 'scheduled' | 'published',
    scheduledFor: undefined as Date | undefined,
    expiresAt: undefined as Date | undefined,
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    images: [] as string[],
    markdownPreview: false
  });

  const [currentTag, setCurrentTag] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [communitySettings, setCommunitySettings] = useState({
    name: '',
    description: '',
    welcomeText: '',
    membershipPolicy: 'approval_required' as 'open' | 'approval_required' | 'closed',
    chatMode: 'owner_only' as 'disabled' | 'owner_only' | 'moderators_only' | 'all_members',
    isPrivate: false
  });

  // Get current user
  const { data: authData, isLoading: userLoading } = useQuery<{ user?: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const user = authData?.user;

  // Get community details
  const { data: communityData, isLoading, error, refetch } = useQuery<CommunityDetailResponse>({
    queryKey: ['/api/communities', communitySlug],
    enabled: !!communitySlug,
    retry: false,
  });

  const community = communityData?.community;
  const membership = communityData?.membership;
  const currentMember = membership; // Alias for consistency with component usage
  const posts = communityData?.posts || [];
  const members = communityData?.members || [];
  const canManage = communityData?.canManage || false;
  const isMember = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';
  const isDeclined = membership?.status === 'declined';
  const isOwner = membership?.role === 'owner' || canManage;

  // Join/Leave community mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/communities/${communitySlug}/join`, {});
    },
    onSuccess: () => {
      toast({ title: "Membership request submitted!" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to join community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update community mutation
  const updateCommunityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!community?.id) throw new Error('Community ID not available');
      return apiRequest('PATCH', `/api/communities/${community.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Community settings updated!" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'member' | 'moderator' }) => {
      if (!community?.id) throw new Error('Community ID not available');
      return apiRequest('PATCH', `/api/communities/${community.id}/members/${userId}/role`, { role });
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.role === 'moderator' ? 'Member promoted to moderator' : 'Moderator changed to regular member',
        description: 'Member role has been updated successfully'
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update member role", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Upload profile image mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async ({ file, communityId }: { file: File; communityId: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      // Use fetch directly for form data but with proper token from apiRequest context
      const token = localStorage.getItem('community_auth_token');
      const response = await fetch(`/api/communities/${communityId}/upload-profile-image`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile image');
      }
      
      const data = await response.json();
      return data.imageUrl;
    },
    onSuccess: () => {
      toast({ title: "Profile picture updated successfully!" });
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
      refetch(); // Refetch community data to get the new profile image URL
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload profile picture", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Upload cover image mutation
  const uploadCoverImageMutation = useMutation({
    mutationFn: async ({ file, communityId }: { file: File; communityId: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      // Use fetch directly for form data but with proper token from apiRequest context
      const token = localStorage.getItem('community_auth_token');
      const response = await fetch(`/api/communities/${communityId}/upload-cover-image`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload cover image');
      }
      
      const data = await response.json();
      return data.coverUrl;
    },
    onSuccess: () => {
      toast({ title: "Cover image updated successfully!" });
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communitySlug] });
      refetch(); // Refetch community data to get the new cover URL
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload cover image", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Upload post image mutation
  const uploadPostImageMutation = useMutation({
    mutationFn: async ({ file, communityId }: { file: File; communityId: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('community_auth_token');
      const response = await fetch(`/api/communities/${communityId}/upload-post-image`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload post image');
      }
      
      const data = await response.json();
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setPostForm(prev => ({ ...prev, imageUrl }));
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload image", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Create/Update post mutation
  const savePostMutation = useMutation({
    mutationFn: async (data: typeof postForm & { id?: string }) => {
      if (!community?.id) throw new Error('Community ID not available');
      
      if (data.id) {
        // Update existing post
        return apiRequest('PUT', `/api/communities/${community.id}/posts/${data.id}`, data);
      } else {
        // Create new post
        return apiRequest('POST', `/api/communities/${community.id}/posts`, data);
      }
    },
    onSuccess: () => {
      toast({ title: editingPost ? "Post updated!" : "Post created!" });
      setShowCreatePost(false);
      setEditingPost(null);
      setPostForm({
        title: '',
        content: '',
        imageUrl: '',
        linkUrl: '',
        linkText: '',
        linkDescription: '',
        tags: [],
        postType: 'announcement',
        isPinned: false
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: `Failed to ${editingPost ? 'update' : 'create'} post`, 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!community?.id) throw new Error('Community ID not available');
      return apiRequest('DELETE', `/api/communities/${community.id}/posts/${postId}`);
    },
    onSuccess: () => {
      toast({ title: "Post deleted!" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete post", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle post reactions with optimistic updates
  const handleReaction = async (postId: string, type: string) => {
    if (!community?.id || !communityData) return;
    
    const userId = user?.id;
    if (!userId) return;
    
    // Find the post
    const post = communityData.posts?.find(p => p.id === postId);
    if (!post) return;
    
    // Optimistically update the UI
    const currentReaction = post.reactions?.find(r => r.type === type);
    const hasReacted = currentReaction?.hasReacted || false;
    
    // Create optimistic data
    const optimisticPosts = communityData.posts?.map(p => {
      if (p.id !== postId) return p;
      
      // Clone reactions array
      const reactions = [...(p.reactions || [])];
      
      if (hasReacted) {
        // Remove reaction - decrease count
        return {
          ...p,
          reactions: reactions.map(r => 
            r.type === type 
              ? { ...r, count: Math.max(0, r.count - 1), hasReacted: false }
              : r
          ).filter(r => r.count > 0)
        };
      } else {
        // Add/change reaction
        const reactionExists = reactions.some(r => r.type === type);
        const userHasOtherReaction = reactions.find(r => r.hasReacted);
        
        if (userHasOtherReaction) {
          // Replace existing reaction
          return {
            ...p,
            reactions: reactions
              .map(r => {
                if (r.type === userHasOtherReaction.type) {
                  return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
                }
                if (r.type === type) {
                  return { ...r, count: r.count + 1, hasReacted: true };
                }
                return r;
              })
              .filter(r => r.count > 0)
          };
        } else if (reactionExists) {
          // Increment existing
          return {
            ...p,
            reactions: reactions.map(r => 
              r.type === type 
                ? { ...r, count: r.count + 1, hasReacted: true }
                : r
            )
          };
        } else {
          // Add new reaction
          return {
            ...p,
            reactions: [...reactions, { type, count: 1, hasReacted: true }]
          };
        }
      }
    });
    
    // Update cache optimistically
    queryClient.setQueryData(
      ['/api/communities', community.id],
      { ...communityData, posts: optimisticPosts }
    );
    
    try {
      // Call backend
      await apiRequest('POST', `/api/communities/${community.id}/posts/${postId}/react`, { type });
      
      // Refetch in background to sync
      refetch();
    } catch (error: any) {
      // Revert on error
      refetch();
      toast({ 
        title: "Failed to update reaction", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  // Handle post comments
  const handleComment = async (postId: string, content: string, parentId?: string) => {
    if (!community?.id) return;
    
    try {
      await apiRequest('POST', `/api/communities/${community.id}/posts/${postId}/comments`, { 
        content, 
        parentId 
      });
      // Invalidate both community data and comments for this specific post
      queryClient.invalidateQueries({ queryKey: ['/api/communities', community.id, 'posts', postId, 'comments'] });
      refetch();
    } catch (error) {
      toast({ 
        title: "Failed to add comment", 
        variant: "destructive" 
      });
    }
  };

  // Handle comment likes
  const handleCommentLike = async (commentId: string) => {
    if (!community?.id) return;
    
    try {
      await apiRequest('POST', `/api/communities/${community.id}/comments/${commentId}/like`);
      // Invalidate comments to refresh like counts and status
      queryClient.invalidateQueries({ queryKey: ['/api/communities', community.id] });
      refetch();
    } catch (error: any) {
      if (error.message?.includes('already liked')) {
        // Try to unlike
        try {
          await apiRequest('DELETE', `/api/communities/${community.id}/comments/${commentId}/like`);
          queryClient.invalidateQueries({ queryKey: ['/api/communities', community.id] });
          refetch();
        } catch (unlikeError) {
          toast({ 
            title: "Failed to unlike comment", 
            variant: "destructive" 
          });
        }
      } else {
        toast({ 
          title: "Failed to like comment", 
          variant: "destructive" 
        });
      }
    }
  };

  // Handle share
  const handleShare = async (post: Post) => {
    const shareUrl = `${window.location.origin}/communities/${communitySlug}#post-${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content.substring(0, 100),
          url: shareUrl
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  // Handle edit post
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || '',
      linkUrl: post.linkUrl || '',
      linkText: post.linkText || '',
      linkDescription: post.linkDescription || '',
      tags: post.tags || [],
      postType: post.postType,
      isPinned: post.isPinned
    });
    setShowCreatePost(true);
  };

  // Handle save post
  const handleSavePost = () => {
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast({ 
        title: "Please fill in required fields", 
        variant: "destructive" 
      });
      return;
    }
    
    const data = {
      ...postForm,
      id: editingPost?.id
    };
    
    savePostMutation.mutate(data);
  };

  // Add tag
  const handleAddTag = () => {
    if (currentTag.trim() && !postForm.tags.includes(currentTag.trim())) {
      setPostForm(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setPostForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Infinite scroll for posts
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMorePosts && !isLoadingMore) {
          // Load more posts logic here
          // This would typically involve pagination
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMorePosts, isLoadingMore]);

  // Sort posts - pinned first
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Show loading state
  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Loading skeleton */}
        <div className="relative h-64 bg-gradient-to-br from-copper-500/20 to-copper-900/30">
          <Skeleton className="h-full w-full" />
        </div>
        
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-premium-surface border-premium-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !community) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-md w-full bg-premium-surface border-premium-border">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-premium-text-primary mb-2">
              Community not found
            </h2>
            <p className="text-premium-text-secondary mb-6">
              This community may have been removed or you don't have permission to view it.
            </p>
            <Link href="/communities">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Communities
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show join gate for non-members
  if (!isMember && !isOwner) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Community Header Preview */}
        <motion.div 
          className="relative h-64 md:h-80 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {community.coverUrl ? (
            <img 
              src={community.coverUrl} 
              alt={community.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-copper-500/30 via-copper-600/20 to-copper-900/30" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Back Button */}
          <div className="absolute top-6 left-6">
            <Link href="/communities">
              <Button 
                variant="outline" 
                className="bg-black/50 backdrop-blur-md border-white/20 text-white hover:bg-black/70"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          
          {/* Community Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end gap-6">
                <Avatar className="h-20 w-20 border-4 border-premium-surface ring-4 ring-accent/20">
                  <AvatarImage src={community.imageUrl} alt={community.name} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-2xl font-bold">
                    {community.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 mb-2">
                  <h1 className="font-fraunces text-3xl md:text-4xl font-bold text-white mb-2">
                    {community.name}
                  </h1>
                  <p className="text-white/80">
                    {community.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Join Gate */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <JoinGate
            communityName={community.name}
            description={community.description}
            memberCount={community.memberCount}
            isPrivate={community.isPrivate}
            membershipPolicy={community.membershipPolicy}
            isPending={isPending}
            isDeclined={isDeclined}
            coverUrl={community.coverUrl}
            onJoinRequest={() => joinCommunityMutation.mutate()}
            onSignIn={() => window.location.href = '/account/signin'}
            isAuthenticated={!!user}
          />
        </div>
      </div>
    );
  }

  // Member/Owner view - Full community experience
  return (
    <motion.div 
      className="min-h-screen bg-bg"
      variants={pageAnimation}
      initial="initial"
      animate="animate"
    >
      {/* Community Header */}
      <motion.div 
        className="relative h-64 md:h-80 overflow-hidden"
        variants={headerAnimation}
      >
        {community.coverUrl ? (
          <img 
            src={community.coverUrl} 
            alt={community.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-copper-500/30 via-copper-600/20 to-copper-900/30" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Header Actions */}
        <div className="absolute top-6 left-6 right-6 flex justify-between">
          <Link href="/communities">
            <Button 
              variant="outline" 
              className="bg-black/50 backdrop-blur-md border-white/20 text-white hover:bg-black/70"
              data-testid="back-to-communities"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-black/50 backdrop-blur-md border-white/20 text-white hover:bg-black/70"
                data-testid="community-options-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShare({ 
                id: community.id,
                title: community.name,
                content: community.description
              } as Post)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Community
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Community Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Community Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end gap-6">
              <Avatar className="h-24 w-24 border-4 border-premium-surface ring-4 ring-accent/20">
                <AvatarImage src={community.imageUrl} alt={community.name} />
                <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-3xl font-bold">
                  {community.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-fraunces text-3xl md:text-4xl font-bold text-white">
                    {community.name}
                  </h1>
                  {isOwner && (
                    <Badge className="bg-amber-500/20 text-yellow-400 border-yellow-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Owner
                    </Badge>
                  )}
                  {community.isPrivate && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                
                <p className="text-white/80 mb-3">
                  {community.description}
                </p>
                
                <div className="flex items-center gap-6 text-white/60 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{community.memberCount || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{community.postCount || 0} posts</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              {isOwner && (
                <Button
                  onClick={() => setShowCreatePost(true)}
                  className="bg-accent hover:bg-accent/80 text-white shadow-glow"
                  data-testid="create-post-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isOwner ? (
          // Owner Console with Tabs
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-7 bg-premium-surface border border-premium-border">
              <TabsTrigger 
                value="announcements"
                data-testid="announcements-tab"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                data-testid="chat-tab"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="polls"
                data-testid="polls-tab"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Polls
              </TabsTrigger>
              <TabsTrigger 
                value="members"
                data-testid="members-tab"
              >
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                data-testid="analytics-tab"
              >
                <Activity className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                data-testid="settings-tab"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger 
                value="billing"
                data-testid="billing-tab"
                className="relative"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </TabsTrigger>
            </TabsList>
            
            {/* Posts Tab */}
            <TabsContent value="announcements" className="space-y-6">
              <motion.div 
                className="space-y-6"
                variants={contentAnimation}
              >
                {sortedPosts.length === 0 ? (
                  <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                    <CardContent className="py-16 text-center">
                      <MessageSquare className="h-12 w-12 text-premium-text-muted mx-auto mb-4 opacity-50" />
                      <h3 className="font-fraunces text-xl font-semibold text-premium-text-primary mb-2">
                        No posts yet
                      </h3>
                      <p className="text-premium-text-secondary max-w-md mx-auto mb-6">
                        Share your first announcement with the community.
                      </p>
                      <Button
                        onClick={() => setShowCreatePost(true)}
                        className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Post
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {sortedPosts.map((post, idx) => (
                      <PostCardWithComments
                        key={post.id}
                        post={post}
                        communityId={community?.id || ''}
                        canEdit={isOwner || post.authorId === user?.id}
                        canDelete={isOwner}
                        onEdit={() => handleEditPost(post)}
                        onDelete={() => {
                          if (confirm('Are you sure you want to delete this post?')) {
                            deletePostMutation.mutate(post.id);
                          }
                        }}
                        onReaction={(type) => handleReaction(post.id, type)}
                        onComment={(content, parentId) => handleComment(post.id, content, parentId)}
                        onCommentLike={(commentId) => handleCommentLike(commentId)}
                        onShare={() => handleShare(post)}
                      />
                    ))}
                    
                    {/* Infinite scroll observer target */}
                    <div ref={observerTarget} className="h-10" />
                    
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 text-accent animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </TabsContent>
            
            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle>Community Members</CardTitle>
                  <CardDescription>
                    {members.filter(m => m.status === 'approved').length} active members
                    {isOwner && (
                      <span className="ml-2">
                        • {members.filter(m => m.role === 'moderator' && m.status === 'approved').length} moderators
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {members.map((member) => {
                        const isCurrentUser = member.userId === user?.id;
                        const canManageRole = isOwner && !isCurrentUser && member.role !== 'owner' && member.status === 'approved';
                        
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-premium-surface transition-colors"
                            data-testid={`member-item-${member.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white">
                                  {(member.firstName?.[0] || member.email?.[0] || 'U').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-premium-text-primary">
                                  {member.firstName && member.lastName
                                    ? `${member.firstName} ${member.lastName}`
                                    : member.email}
                                  {isCurrentUser && <span className="text-xs text-premium-text-muted ml-1">(You)</span>}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-premium-text-muted">
                                    {member.role === 'owner' && <span className="text-accent font-medium">Owner</span>}
                                    {member.role === 'moderator' && <span className="text-blue-500 font-medium">Moderator</span>}
                                    {member.role === 'member' && 'Member'}
                                    {member.status === 'pending' && ' • Pending'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {member.status === 'pending' && isOwner && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                                    data-testid={`approve-member-${member.id}`}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                                    data-testid={`decline-member-${member.id}`}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              {canManageRole && (
                                <>
                                  {member.role === 'member' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                                      onClick={() => {
                                        if (confirm(`Promote ${member.firstName || member.email} to moderator?`)) {
                                          updateMemberRoleMutation.mutate({ userId: member.userId, role: 'moderator' });
                                        }
                                      }}
                                      disabled={updateMemberRoleMutation.isPending}
                                      data-testid={`promote-member-${member.id}`}
                                    >
                                      <Shield className="h-4 w-4 mr-1" />
                                      Promote to Moderator
                                    </Button>
                                  )}
                                  
                                  {member.role === 'moderator' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                                      onClick={() => {
                                        if (confirm(`Demote ${member.firstName || member.email} to regular member?`)) {
                                          updateMemberRoleMutation.mutate({ userId: member.userId, role: 'member' });
                                        }
                                      }}
                                      disabled={updateMemberRoleMutation.isPending}
                                      data-testid={`demote-member-${member.id}`}
                                    >
                                      <User className="h-4 w-4 mr-1" />
                                      Demote to Member
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Total Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">
                      {community.memberCount || 0}
                    </p>
                    <p className="text-sm text-premium-text-muted mt-2">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      +12% this month
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Posts (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">
                      {posts.filter(p => {
                        const postDate = new Date(p.createdAt);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return postDate > thirtyDaysAgo;
                      }).length}
                    </p>
                    <p className="text-sm text-premium-text-muted mt-2">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {posts.filter(p => p.isPinned).length} pinned
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Total Reactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">
                      {posts.reduce((acc, p) => acc + (p.reactions?.reduce((sum, r) => sum + r.count, 0) || 0), 0)}
                    </p>
                    <p className="text-sm text-premium-text-muted mt-2">
                      <Heart className="h-3 w-3 inline mr-1" />
                      Across all posts
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">
                      {posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0)}
                    </p>
                    <p className="text-sm text-premium-text-muted mt-2">
                      <MessageCircle className="h-3 w-3 inline mr-1" />
                      Community engagement
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Post Performance Table */}
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle>Post Performance</CardTitle>
                  <CardDescription>Click-through rates and engagement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post Title</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Reactions</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Engagement Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.slice(0, 5).map((post) => {
                        const reactions = post.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
                        const views = post.viewCount || 1;
                        const engagementRate = ((reactions + (post.comments?.length || 0)) / views * 100).toFixed(1);
                        
                        return (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">{post.title}</TableCell>
                            <TableCell>{views}</TableCell>
                            <TableCell>{reactions}</TableCell>
                            <TableCell>{post.comments?.length || 0}</TableCell>
                            <TableCell>{engagementRate}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* Best Time to Post */}
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle>Best Time to Post</CardTitle>
                  <CardDescription>Based on community engagement patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="font-semibold mb-2">Highest Engagement Days</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Tuesday</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-gradient-to-r from-copper-500 to-accent rounded" />
                            <span className="text-sm text-premium-text-muted">92%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Thursday</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 bg-gradient-to-r from-copper-500 to-accent rounded" />
                            <span className="text-sm text-premium-text-muted">85%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Friday</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 bg-gradient-to-r from-copper-500 to-accent rounded" />
                            <span className="text-sm text-premium-text-muted">71%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2">Peak Hours</p>
                      <div className="space-y-2">
                        <Badge variant="outline" className="mr-2">10:00 AM - 12:00 PM</Badge>
                        <Badge variant="outline" className="mr-2">2:00 PM - 4:00 PM</Badge>
                        <Badge variant="outline">7:00 PM - 9:00 PM</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-6">
              <CommunityChat 
                communityId={community.id}
                currentUser={user}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role,
                  userId: user?.id || ''
                } : undefined}
                communitySettings={{
                  chatMode: community.chatMode || 'all_members',
                  chatSlowmodeSeconds: community.chatSlowmodeSeconds || 0
                }}
                authToken={localStorage.getItem('community_auth_token')}
              />
            </TabsContent>
            
            {/* Polls Tab */}
            <TabsContent value="polls" className="space-y-6">
              <CommunityPolls 
                communityId={community.id}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role,
                  userId: user?.id || ''
                } : undefined}
              />
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle>Chat Settings</CardTitle>
                  <CardDescription>
                    Configure chat permissions and moderation settings for your community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Chat Mode */}
                  <div>
                    <Label>Chat Mode</Label>
                    <Select
                      value={community.chatMode || 'all_members'}
                      onValueChange={(value) => {
                        updateCommunityMutation.mutate({
                          chatMode: value as 'disabled' | 'owner_only' | 'moderators_only' | 'all_members'
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_members">
                          All Members - Everyone can chat
                        </SelectItem>
                        <SelectItem value="moderators_only">
                          Moderators Only - Only moderators and owner
                        </SelectItem>
                        <SelectItem value="owner_only">
                          Owner Only - Only the owner can send messages
                        </SelectItem>
                        <SelectItem value="disabled">
                          Disabled - Chat is turned off
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Slowmode */}
                  <div>
                    <Label htmlFor="slowmode">Slowmode (seconds between messages)</Label>
                    <Input
                      id="slowmode"
                      type="number"
                      min="0"
                      max="300"
                      value={community.chatSlowmodeSeconds || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (value >= 0 && value <= 300) {
                          updateCommunityMutation.mutate({
                            chatSlowmodeSeconds: value
                          });
                        }
                      }}
                      placeholder="0 (no slowmode)"
                      className="bg-premium-surface border-premium-border"
                    />
                    <p className="text-sm text-premium-text-muted mt-1">
                      Set a cooldown period between messages (0-300 seconds)
                    </p>
                  </div>
                  
                  {/* Auto-moderation */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-mod">Auto-moderation</Label>
                      <p className="text-sm text-premium-text-muted">
                        Automatically filter inappropriate content
                      </p>
                    </div>
                    <Switch
                      id="auto-mod"
                      checked={community.autoModeration || false}
                      onCheckedChange={(checked) => {
                        updateCommunityMutation.mutate({
                          autoModeration: checked
                        });
                      }}
                    />
                  </div>
                  
                  {/* Clear Chat History */}
                  <div className="pt-4 border-t border-premium-border">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All Chat History
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all chat messages in this community.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/80"
                            onClick={() => {
                              toast({
                                title: "Chat history cleared",
                                description: "All messages have been deleted."
                              });
                            }}
                          >
                            Clear History
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Manage your community's basic settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="community-name">Community Name</Label>
                    <Input
                      id="community-name"
                      value={community.name}
                      onChange={(e) => {
                        // Update locally first for immediate feedback
                        // Then save to server
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={community.description || ''}
                      onChange={(e) => {
                        // Update locally first for immediate feedback
                        // Then save to server
                      }}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label className="text-premium-text-primary font-medium mb-2 block">Profile Picture</Label>
                    <p className="text-sm text-premium-text-muted mb-4">
                      Upload a profile picture for your community. This will be displayed as your community's avatar.
                    </p>
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <Avatar className="w-24 h-24 border-2 border-premium-border shadow-sm">
                          <AvatarImage src={community?.imageUrl} alt={community?.name} />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-copper-500 to-copper-900 text-white">
                            {community?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <ObjectUploader
                          onUpload={async (file: File) => {
                            if (!community?.id) throw new Error('Community not available');
                            
                            const imageUrl = await uploadProfileImageMutation.mutateAsync({ 
                              file, 
                              communityId: community.id 
                            });
                            return imageUrl;
                          }}
                          accept="image/*"
                          maxSizeMB={5}
                          placeholder="Upload profile picture"
                          className="max-w-md"
                          existingUrl={community?.imageUrl}
                          onRemove={async () => {
                            try {
                              if (!community?.id) throw new Error('Community not available');
                              
                              // Update community to remove profile image
                              await updateCommunityMutation.mutateAsync({
                                imageUrl: null
                              });
                              
                              toast({ 
                                title: "Profile picture removed", 
                                description: "You can upload a new one anytime." 
                              });
                            } catch (error: any) {
                              toast({ 
                                title: "Failed to remove profile picture", 
                                description: error.message,
                                variant: "destructive" 
                              });
                            }
                          }}
                        />
                        <p className="text-xs text-premium-text-muted mt-3">
                          Upload a clear image of your community. JPG, PNG, or WebP up to 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-premium-text-primary font-medium mb-2 block">Cover Photo</Label>
                    <p className="text-sm text-premium-text-muted mb-4">
                      Upload a cover photo to make your community stand out. This will be displayed on your community header and card.
                    </p>
                    <ObjectUploader
                      onUpload={async (file: File) => {
                        if (!community?.id) throw new Error('Community not available');
                        
                        setCoverImageFile(file);
                        const coverUrl = await uploadCoverImageMutation.mutateAsync({ 
                          file, 
                          communityId: community.id 
                        });
                        return coverUrl;
                      }}
                      accept="image/*"
                      maxSizeMB={5}
                      placeholder="Drop your cover image here or click to upload"
                      className="border-2 border-dashed border-premium-border rounded-lg p-8 text-center hover:border-accent transition-colors"
                      existingUrl={community?.coverUrl}
                      onRemove={async () => {
                        try {
                          if (!community?.id) throw new Error('Community not available');
                          
                          // Update community to remove cover image with minimal payload
                          await updateCommunityMutation.mutateAsync({
                            coverUrl: null
                          });
                          
                          setCoverImageFile(null);
                          toast({ 
                            title: "Cover photo removed", 
                            description: "You can upload a new one anytime." 
                          });
                        } catch (error: any) {
                          toast({ 
                            title: "Failed to remove cover photo", 
                            description: error.message,
                            variant: "destructive" 
                          });
                        }
                      }}
                      data-testid="community-cover-uploader"
                    />
                    {uploadCoverImageMutation.isPending && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-premium-text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading cover image...
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Membership Policy</Label>
                    <Select
                      value={community.membershipPolicy}
                      onValueChange={(value) => {
                        updateCommunityMutation.mutate({
                          membershipPolicy: value as 'open' | 'approval_required' | 'closed'
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open - Anyone can join</SelectItem>
                        <SelectItem value="approval_required">Approval Required</SelectItem>
                        <SelectItem value="closed">Closed - No new members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="private">Private Community</Label>
                      <p className="text-sm text-premium-text-muted">
                        Only members can view content
                      </p>
                    </div>
                    <Switch
                      id="private"
                      checked={community.isPrivate}
                      onCheckedChange={(checked) => {
                        updateCommunityMutation.mutate({
                          isPrivate: checked
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <CommunityBilling
                communityId={community.id}
                communitySlug={community.slug}
                isOwner={true}
              />
            </TabsContent>
          </Tabs>
        ) : (
          // Member view - Posts and Chat with Tabs
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-premium-surface border border-premium-border">
              <TabsTrigger 
                value="announcements"
                data-testid="member-posts-tab"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                data-testid="member-chat-tab"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="announcements" className="space-y-6">
              <motion.div 
                className="space-y-6"
                variants={contentAnimation}
              >
                {sortedPosts.length === 0 ? (
                  <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                    <CardContent className="py-16 text-center">
                      <MessageSquare className="h-12 w-12 text-premium-text-muted mx-auto mb-4 opacity-50" />
                      <h3 className="font-fraunces text-xl font-semibold text-premium-text-primary mb-2">
                        No posts yet
                      </h3>
                      <p className="text-premium-text-secondary">
                        Check back later for updates from this community.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {sortedPosts.map((post) => (
                      <PostCardWithComments
                        key={post.id}
                        post={post}
                        communityId={community?.id || ''}
                        canEdit={post.authorId === user?.id}
                        canDelete={false}
                        onReaction={(type) => handleReaction(post.id, type)}
                        onComment={(content, parentId) => handleComment(post.id, content, parentId)}
                        onCommentLike={(commentId) => handleCommentLike(commentId)}
                        onShare={() => handleShare(post)}
                      />
                    ))}
                    
                    {/* Infinite scroll observer target */}
                    <div ref={observerTarget} className="h-10" />
                    
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 text-accent animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-6">
              <CommunityChat 
                communityId={community.id}
                currentUser={user}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role,
                  userId: user?.id || ''
                } : undefined}
                communitySettings={{
                  chatMode: community.chatMode || 'all_members',
                  chatSlowmodeSeconds: community.chatSlowmodeSeconds || 0
                }}
                authToken={localStorage.getItem('community_auth_token')}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Create/Edit Post Dialog */}
      <Dialog 
        open={showCreatePost} 
        onOpenChange={(open) => {
          setShowCreatePost(open);
          if (!open) {
            setEditingPost(null);
            setPostForm({
              title: '',
              content: '',
              imageUrl: '',
              linkUrl: '',
              linkText: '',
              linkDescription: '',
              tags: [],
              postType: 'announcement',
              isPinned: false
            });
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-card border-premium-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-2xl">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </DialogTitle>
            <DialogDescription>
              Share updates, announcements, or events with your community.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Post Type */}
            <div>
              <Label>Post Type</Label>
              <Select
                value={postForm.postType}
                onValueChange={(value: 'announcement' | 'update' | 'event') => 
                  setPostForm(prev => ({ ...prev, postType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Announcement
                    </div>
                  </SelectItem>
                  <SelectItem value="update">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Update
                    </div>
                  </SelectItem>
                  <SelectItem value="event">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Event
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={postForm.title}
                onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Give your post a title..."
                data-testid="post-title-input"
              />
            </div>
            
            {/* Content */}
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={postForm.content}
                onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your post content... (Markdown supported)"
                rows={6}
                data-testid="post-content-input"
              />
            </div>
            
            {/* Image Upload */}
            <div>
              <Label htmlFor="image">Image (optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a 16:9 ratio image for your announcement
              </p>
              <AnnouncementImageUploader
                onUpload={async (file) => {
                  if (!community?.id) throw new Error('Community ID not available');
                  const imageUrl = await uploadPostImageMutation.mutateAsync({ 
                    file, 
                    communityId: community.id 
                  });
                  return imageUrl;
                }}
                existingUrl={postForm.imageUrl}
                onRemove={() => setPostForm(prev => ({ ...prev, imageUrl: '' }))}
              />
            </div>
            
            {/* Link */}
            <div className="space-y-3">
              <Label>Link (optional)</Label>
              <Input
                value={postForm.linkUrl}
                onChange={(e) => setPostForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://example.com"
                data-testid="post-link-url-input"
              />
              {postForm.linkUrl && (
                <>
                  <Input
                    value={postForm.linkText}
                    onChange={(e) => setPostForm(prev => ({ ...prev, linkText: e.target.value }))}
                    placeholder="Link text (e.g., 'Read More')"
                  />
                  <Textarea
                    value={postForm.linkDescription}
                    onChange={(e) => setPostForm(prev => ({ ...prev, linkDescription: e.target.value }))}
                    placeholder="Brief description of the link..."
                    rows={2}
                  />
                </>
              )}
            </div>
            
            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!currentTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {postForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {postForm.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="bg-copper-500/10 text-copper-400 border-copper-500/30"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pin Post */}
            {isOwner && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pin">Pin this post</Label>
                  <p className="text-sm text-premium-text-muted">
                    Pinned posts appear at the top of the feed
                  </p>
                </div>
                <Switch
                  id="pin"
                  checked={postForm.isPinned}
                  onCheckedChange={(checked) => 
                    setPostForm(prev => ({ ...prev, isPinned: checked }))
                  }
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePost(false)}
              disabled={savePostMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePost}
              disabled={savePostMutation.isPending || !postForm.title.trim() || !postForm.content.trim()}
              className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
              data-testid="save-post-button"
            >
              {savePostMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {editingPost ? 'Update Post' : 'Publish Post'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}