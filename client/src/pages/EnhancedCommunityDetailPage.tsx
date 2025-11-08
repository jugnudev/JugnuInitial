import { useState, useEffect, useRef, useLayoutEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Ticket,
  Settings2,
  RefreshCw,
  CreditCard,
  Vote,
  Gift,
  Copy,
  Check,
  AlertTriangle,
  QrCode
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AnnouncementImageUploader } from "@/components/community/AnnouncementImageUploader";
import { PostCard } from "@/components/PostCard";
import { JoinGate } from "@/components/JoinGate";
import CommunityChat from "@/components/CommunityChat";
import CommunityPolls from "@/components/CommunityPolls";
import CommunityGiveaways from "@/components/CommunityGiveaways";
import CommunityBilling from "@/components/CommunityBilling";
import CommunityTicketedEvents from "@/components/CommunityTicketedEvents";
import BillingCheckout from "@/components/BillingCheckout";
import { BetaBadge } from "@/components/BetaBadge";
import { NotificationPreferences } from "@/components/NotificationPreferences";
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
import type { Community, CommunityMembership, CommunityPost, CommunityComment } from "@shared/schema";

// Extended member type with user information for display
type Member = CommunityMembership & {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    createdAt: string;
    role: string;
  };
};

// Extended post type with author and engagement data
type Post = CommunityPost & {
  author?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  authorName?: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  viewCount?: number;
  reactions?: {
    type: string;
    count: number;
    hasReacted?: boolean;
  }[];
  comments?: CommentWithReplies[];
};

// Extended comment type with likes and replies
type CommentWithReplies = CommunityComment & {
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  likes: number;
  hasLiked?: boolean;
  replies?: CommentWithReplies[];
  isEdited?: boolean;
};

interface User {
  id: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

interface CommunityDetailResponse {
  community?: Community;
  membership?: CommunityMembership;
  posts?: Post[];
  members?: Member[];
  canManage?: boolean;
}

// PostCard wrapper that fetches comments for each post
function PostCardWithComments({
  post,
  communityId,
  communityName,
  communityImageUrl,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  ...otherProps
}: {
  post: Post;
  communityId: string;
  communityName?: string;
  communityImageUrl?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  [key: string]: any;
}) {
  const { data: commentsData } = useQuery({
    queryKey: ['/api/communities', communityId, 'posts', post.id, 'comments'],
    enabled: !!communityId && !!post.id,
    retry: false,
  });
  
  const comments = commentsData?.comments || [];
  
  // Transform author data based on postAsBusiness flag
  let authorName = post.authorName || 'Community Member';
  let authorAvatar = post.authorAvatar;
  
  if (post.postAsBusiness !== false && communityName) {
    // Post as business (default behavior) - use community profile image
    authorName = communityName;
    authorAvatar = communityImageUrl; // Use community's profile image
  } else if (post.author) {
    // Post as user
    authorName = `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'Unknown User';
    authorAvatar = post.author.profileImageUrl;
  }
  
  return (
    <PostCard
      {...post}
      authorName={authorName}
      authorAvatar={authorAvatar}
      comments={comments}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
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
  const communitySlug = params?.slug || '';  // Use URL slug directly
  
  // Read initial tab from URL query parameter
  const getTabFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('tab') || 'announcements';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const { toast } = useToast();
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // View as Member mode - allows owners/moderators to see community as regular members
  const getViewAsMemberFromStorage = () => {
    if (!communitySlug) return false;
    const stored = localStorage.getItem(`viewAsMember_${communitySlug}`);
    return stored === 'true';
  };
  
  const [viewAsMember, setViewAsMember] = useState(false);
  const lastRehydratedSlugRef = useRef<string | null>(null);

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
    postAsBusiness: true,
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
  const [slowmodeValue, setSlowmodeValue] = useState<string>('0');
  const [bannedWordsValue, setBannedWordsValue] = useState<string>('');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  
  // Custom dialog states
  const [deletePostDialog, setDeletePostDialog] = useState<{ open: boolean; postId: string | null }>({ open: false, postId: null });
  const [promoteMemberDialog, setPromoteMemberDialog] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [demoteMemberDialog, setDemoteMemberDialog] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
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

  // Get organizer ticketing data
  const { data: organizerData } = useQuery<{ ok: boolean; organizer: any | null; events?: any[] }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: !!user?.id,
    retry: false,
  });

  // Navigation hook for routing
  const [location, setLocation] = useLocation();

  // Handle Stripe Connect return with ticketing=success param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketingSuccess = urlParams.get('ticketing');
    
    if (ticketingSuccess === 'success' && communitySlug) {
      // Force refetch community data after Stripe return to get updated organizer status
      refetch();
      
      toast({
        title: "Ticketing Connected!",
        description: "Your Stripe Connect account is being set up. You can now create events and sell tickets.",
      });
      
      // Clean up URL without reloading page
      const newUrl = `${window.location.pathname}?tab=settings`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [communitySlug, refetch, toast]);

  const community = communityData?.community;
  const membership = communityData?.membership;
  const currentMember = membership; // Alias for consistency with component usage
  const posts = communityData?.posts || [];
  const members = communityData?.members || [];
  const canManage = communityData?.canManage || false;
  const isMember = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';
  const isDeclined = membership?.status === 'declined';
  
  // Track actual role for display purposes
  const actualIsOwner = membership?.role === 'owner' || canManage;
  const actualIsOwnerOrModerator = actualIsOwner || membership?.role === 'moderator';
  
  // Override roles when in "View as Member" mode
  const isOwner = viewAsMember ? false : actualIsOwner;
  const isOwnerOrModerator = viewAsMember ? false : actualIsOwnerOrModerator;

  // Rehydrate viewAsMember from localStorage when communitySlug changes
  // Using useLayoutEffect to ensure state is updated synchronously before write effect runs
  useLayoutEffect(() => {
    if (communitySlug && communitySlug !== lastRehydratedSlugRef.current) {
      // Load the correct value for this community
      const storedValue = getViewAsMemberFromStorage();
      setViewAsMember(storedValue);
      
      // Mark this slug as rehydrated
      lastRehydratedSlugRef.current = communitySlug;
    }
  }, [communitySlug]);
  
  // Sync viewAsMember with localStorage (only after slug has been rehydrated)
  useEffect(() => {
    // Only write if we've already rehydrated this specific slug
    if (communitySlug && lastRehydratedSlugRef.current === communitySlug) {
      localStorage.setItem(`viewAsMember_${communitySlug}`, String(viewAsMember));
    }
  }, [viewAsMember, communitySlug]);
  
  // Toggle view as member mode
  const toggleViewAsMember = () => {
    setViewAsMember(!viewAsMember);
    toast({
      title: !viewAsMember ? "Viewing as Member" : "Management Mode Restored",
      description: !viewAsMember 
        ? "You're now seeing the community as a regular member would" 
        : "All management features are now visible again",
    });
  };

  // Sync slowmode value when community data loads
  useEffect(() => {
    if (community?.chatSlowmodeSeconds !== undefined) {
      setSlowmodeValue(String(community.chatSlowmodeSeconds));
    }
  }, [community?.chatSlowmodeSeconds]);

  // Sync banned words value when community data loads
  useEffect(() => {
    if (community?.bannedWords !== undefined) {
      setBannedWordsValue(community.bannedWords.join(', '));
    }
  }, [community?.bannedWords]);

  // Sync community settings when community data loads
  useEffect(() => {
    if (community) {
      setCommunitySettings({
        name: community.name || '',
        description: community.description || '',
        welcomeText: community.welcomeText || '',
        membershipPolicy: community.membershipPolicy || 'approval_required',
        chatMode: community.chatMode || 'all_members',
        isPrivate: community.isPrivate || false
      });
    }
  }, [community?.id]);

  // Sync activeTab with URL query parameter (on mount and URL changes)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);

  // Update URL when tab changes (but preserve other query params)
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Update URL with new tab
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tab', newTab);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Get analytics data (only if member/owner and analytics tab is active)
  const { data: analyticsData } = useQuery<{
    ok: boolean;
    analytics: {
      totalMembers: number;
      totalPosts: number;
      totalReactions: number;
      totalComments: number;
      totalViews: number;
      engagementRate: number; // Raw decimal (0-1)
      memberGrowthRate: number; // Raw decimal (0-1)
      bestTimeToPost: {
        days: { day: string; percentage: number }[];
        hours: string[];
      };
      avgEngagementPerPost: number; // Raw number
      mostActiveMembers: {
        userId: string;
        name: string;
        totalActivity: number;
        reactions: number;
        comments: number;
      }[];
      engagementTrend: {
        weeklyData: { week: string; engagement: number }[];
        trendPercentage: number;
        direction: 'growing' | 'declining' | 'stable';
      };
      topPostTypes: {
        type: string;
        avgEngagement: number;
        count: number;
      }[];
      avgResponseTimeMinutes: number; // Raw minutes
      retentionRate: number; // Raw decimal (0-1)
      lastUpdated: string;
    };
  }>({
    queryKey: ['/api/communities', community?.id, 'analytics'],
    enabled: !!community?.id && (isMember || isOwner) && activeTab === 'analytics',
    retry: false,
  });
  const analytics = analyticsData?.analytics;

  // Get invite links (only for owners and moderators)
  const { data: invitesData } = useQuery<{
    ok: boolean;
    invites: Array<{
      id: string;
      code: string;
      createdBy: string;
      expiresAt: string | null;
      maxUses: number | null;
      currentUses: number;
      status: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ['/api/communities', community?.id, 'invites'],
    enabled: !!community?.id && isOwnerOrModerator,
    retry: false,
  });
  const invites = invitesData?.invites || [];
  const permanentInvite = invites.find(inv => inv.status === 'active' && !inv.expiresAt && !inv.maxUses);

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

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      if (!community?.id) throw new Error('Community ID not available');
      return apiRequest('POST', `/api/communities/${community.id}/members/${userId}/remove`, { reason });
    },
    onSuccess: () => {
      toast({ 
        title: 'Member removed',
        description: 'The member has been removed from the community'
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove member", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Create invite link mutation
  const createInviteLinkMutation = useMutation({
    mutationFn: async () => {
      if (!community?.id) throw new Error('Community ID not available');
      return apiRequest('POST', `/api/communities/${community.id}/invites`, {});
    },
    onSuccess: () => {
      toast({ title: "Invite link created!" });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', community?.id, 'invites'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invite link", 
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
        isPinned: false,
        postAsBusiness: true
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

  // Track debounce timers and initial states per post for reactions
  const reactionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reactionInitialStates = useRef<Map<string, { type: string | null }>>(new Map());
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      reactionTimers.current.forEach(timer => clearTimeout(timer));
      reactionTimers.current.clear();
    };
  }, []);
  
  // Handle post reactions with optimistic updates and debouncing
  const handleReaction = async (postId: string, type: string) => {
    if (!community?.id || !communityData || !communitySlug) return;
    
    const userId = user?.id;
    if (!userId) return;
    
    // Snapshot initial state if this is the first click in a debounce window
    if (!reactionTimers.current.has(postId)) {
      const currentData = queryClient.getQueryData(['/api/communities', communitySlug]) as any;
      const post = currentData?.posts?.find((p: any) => p.id === postId);
      const currentReaction = post?.reactions?.find((r: any) => r.hasReacted);
      reactionInitialStates.current.set(postId, { 
        type: currentReaction?.type || null 
      });
    }
    
    // Immediately update the UI optimistically
    queryClient.setQueryData(['/api/communities', communitySlug], (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        posts: oldData.posts.map((post: any) => {
          if (post.id !== postId) return post;
          
          const reactions = post.reactions || [];
          const existingReaction = reactions.find((r: any) => r.type === type);
          
          if (existingReaction?.hasReacted) {
            // User is removing their reaction
            return {
              ...post,
              reactions: reactions.map((r: any) =>
                r.type === type
                  ? { ...r, count: Math.max(0, r.count - 1), hasReacted: false }
                  : r
              ).filter((r: any) => r.count > 0) // Remove reactions with 0 count
            };
          } else {
            // User is adding a reaction
            // First, remove any previous reaction from this user
            let updatedReactions = reactions.map((r: any) => {
              if (r.hasReacted && r.type !== type) {
                // Remove user's previous reaction
                return { ...r, count: Math.max(0, r.count - 1), hasReacted: false };
              }
              return r;
            }).filter((r: any) => r.count > 0); // Remove reactions with 0 count
            
            // Check if the clicked reaction type exists in the updated array
            const reactionExistsInUpdated = updatedReactions.find((r: any) => r.type === type);
            
            if (reactionExistsInUpdated) {
              // Reaction type exists in updated array, increment count and set hasReacted
              updatedReactions = updatedReactions.map((r: any) =>
                r.type === type
                  ? { ...r, count: r.count + 1, hasReacted: true }
                  : r
              );
            } else {
              // New reaction type - add it
              updatedReactions = [...updatedReactions, { type, count: 1, hasReacted: true }];
            }
            
            return {
              ...post,
              reactions: updatedReactions
            };
          }
        })
      };
    });
    
    // Cancel previous debounce timer for this post if exists
    const existingTimer = reactionTimers.current.get(postId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Debounce the API call to avoid excessive requests during rapid clicking
    const timer = setTimeout(async () => {
      try {
        // Get initial and final states to determine net change
        const initialState = reactionInitialStates.current.get(postId);
        const currentData = queryClient.getQueryData(['/api/communities', communitySlug]) as any;
        const post = currentData?.posts?.find((p: any) => p.id === postId);
        const finalReaction = post?.reactions?.find((r: any) => r.hasReacted);
        const finalType = finalReaction?.type || null;
        
        // Determine what API calls to make based on state change
        if (initialState?.type === finalType) {
          // No net change - do nothing
        } else if (initialState?.type && finalType && initialState.type !== finalType) {
          // Switched from one reaction to another - just toggle the new one
          // The server will automatically remove the old one
          await apiRequest('POST', `/api/communities/${community.id}/posts/${postId}/react`, { type: finalType });
        } else if (!initialState?.type && finalType) {
          // Added a reaction
          await apiRequest('POST', `/api/communities/${community.id}/posts/${postId}/react`, { type: finalType });
        } else if (initialState?.type && !finalType) {
          // Removed a reaction
          await apiRequest('POST', `/api/communities/${community.id}/posts/${postId}/react`, { type: initialState.type });
        }
        
        // Don't refetch immediately - trust the optimistic update
        // This prevents UI from reverting to stale data during rapid clicking
      } catch (error: any) {
        // Revert optimistic update on error
        await refetch();
        toast({ 
          title: "Failed to update reaction", 
          description: error.message || "Please try again",
          variant: "destructive" 
        });
      } finally {
        // Cleanup references
        reactionTimers.current.delete(postId);
        reactionInitialStates.current.delete(postId);
      }
    }, 300); // 300ms debounce
    
    // Store the timer
    reactionTimers.current.set(postId, timer);
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
  const handleCommentEdit = async (commentId: string, content: string) => {
    if (!community?.id) return;
    
    try {
      await apiRequest('PATCH', `/api/communities/${community.id}/comments/${commentId}`, { content });
      // Invalidate comments to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/communities', community.id] });
      refetch();
    } catch (error: any) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!community?.id) return;
    
    try {
      await apiRequest('DELETE', `/api/communities/${community.id}/comments/${commentId}`);
      // Invalidate comments to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/communities', community.id] });
      refetch();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
    }
  };

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
      isPinned: post.isPinned,
      postAsBusiness: post.postAsBusiness !== false // Default to true if undefined
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
          className="relative h-72 sm:h-80 md:h-96 overflow-hidden"
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          
          {/* Back Button */}
          <div className="absolute top-4 md:top-6 left-4 md:left-6">
            <Link href="/communities">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-black/50 backdrop-blur-md border-white/20 text-white hover:bg-black/70"
              >
                <ArrowLeft className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Back</span>
              </Button>
            </Link>
          </div>
          
          {/* Community Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-black/50 shadow-2xl ring-2 ring-white/10">
                  <AvatarImage src={community.imageUrl} alt={community.name} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-3xl sm:text-4xl font-bold">
                    {community.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 w-full sm:mb-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                    <h1 className="font-fraunces text-2xl sm:text-3xl md:text-4xl font-bold text-white break-words">
                      {community.name}
                    </h1>
                    <BetaBadge size="md" variant="prominent" />
                  </div>
                  <p className="text-white/90 text-sm sm:text-base leading-relaxed">
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
        className="relative h-80 sm:h-96 md:h-[28rem] overflow-hidden"
        variants={headerAnimation}
      >
        {community.coverUrl ? (
          <img 
            src={community.coverUrl} 
            alt={community.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-copper-500/30 via-copper-600/20 to-copper-900/30" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
        
        {/* Header Actions */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-center gap-3 z-30">
          <Link href="/communities">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-black/60 backdrop-blur-md border-white/30 text-white hover:bg-black/80 transition-all min-h-[48px] min-w-[48px] sm:min-h-[40px] sm:min-w-auto"
              data-testid="back-to-communities"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-black/60 backdrop-blur-md border-white/30 text-white hover:bg-black/80 transition-all min-h-[48px] min-w-[48px] sm:min-h-[40px] sm:min-w-auto"
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
              {actualIsOwnerOrModerator && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleViewAsMember} data-testid="toggle-view-as-member">
                    <Eye className="h-4 w-4 mr-2" />
                    {viewAsMember ? "Exit Member View" : "View as Member"}
                  </DropdownMenuItem>
                </>
              )}
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
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 sm:pb-8 pt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col space-y-5">
              {/* Avatar and Title Row */}
              <div className="flex items-end gap-4">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white/20 shadow-2xl flex-shrink-0">
                  <AvatarImage src={community.imageUrl} alt={community.name} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-2xl sm:text-3xl font-bold">
                    {community.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                    <h1 className="font-fraunces text-2xl sm:text-3xl md:text-4xl font-bold text-white break-words leading-tight">
                      {community.name}
                    </h1>
                    <BetaBadge size="md" variant="prominent" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner && (
                      <Badge className="bg-amber-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Owner
                      </Badge>
                    )}
                    {community.isPrivate && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-3xl">
                {community.description}
              </p>
              
              {/* Stats and CTA Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-6 text-white/70 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{community.memberCount || 0} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{community.postCount || 0} posts</span>
                  </div>
                </div>
                
                {/* Quick Actions */}
                {isOwner && (
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-accent/90 text-black font-semibold shadow-lg transition-all w-full sm:w-auto sm:ml-auto"
                    data-testid="create-post-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* View as Member Banner */}
      {viewAsMember && actualIsOwnerOrModerator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-gradient-to-r from-jade-500/90 to-accent/90 backdrop-blur-md border-b border-jade-400/30 shadow-lg"
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-charcoal-900 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-sm font-semibold text-charcoal-900">Member View Active</span>
                  <span className="text-xs text-charcoal-800/90">You're seeing what regular members see</span>
                </div>
              </div>
              <Button
                onClick={toggleViewAsMember}
                variant="outline"
                size="sm"
                className="bg-charcoal-900/90 text-white hover:bg-charcoal-800 border-charcoal-700 flex-shrink-0"
                data-testid="exit-member-view"
              >
                Exit
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {isOwnerOrModerator ? (
          // Owner/Moderator Console with Tabs
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* Mobile Dropdown Navigation */}
            <div className="md:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full h-14 bg-gradient-to-r from-copper-500/10 via-primary-900/20 to-copper-600/10 border-2 border-copper-500/30 hover:border-copper-400/50 backdrop-blur-2xl shadow-lg shadow-copper-500/10 rounded-2xl transition-all duration-300 text-white font-semibold text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-charcoal-950/98 border-2 border-copper-500/30 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-copper-500/20 min-w-[calc(100vw-2rem)] mt-2">
                  <SelectItem 
                    value="announcements" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      <span>Posts</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="chat" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5" />
                      <span>Chat</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="polls" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Vote className="h-5 w-5" />
                      <span>Polls</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="giveaways" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5" />
                      <span>Giveaways</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="events" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5" />
                      <span>Events</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="manage-events" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Settings2 className="h-5 w-5" />
                      <span>Manage Events</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="members" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5" />
                      <span>Members</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="analytics" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5" />
                      <span>Analytics</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="settings" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="billing" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <span>Billing</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tab Navigation - Premium Redesign */}
            <div className="hidden md:block space-y-3">
              {/* First Row - Main Features */}
              <div className="relative overflow-hidden rounded-2xl border border-copper-500/30 shadow-2xl shadow-black/30">
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900/95 via-charcoal-950/98 to-charcoal-900/95 backdrop-blur-3xl" />
                
                {/* Subtle Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-transparent to-copper-500/5" />
                
                {/* Content */}
                <div className="relative p-2">
                  <TabsList className="grid grid-cols-5 gap-1.5 bg-transparent w-full p-0">
                    <TabsTrigger 
                      value="announcements"
                      data-testid="announcements-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Posts</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chat"
                      data-testid="chat-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="polls"
                      data-testid="polls-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Vote className="h-4 w-4" />
                      <span>Polls</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="giveaways"
                      data-testid="giveaways-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Gift className="h-4 w-4" />
                      <span>Giveaways</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="events"
                      data-testid="owner-events-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Ticket className="h-4 w-4" />
                      <span>Events</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              {/* Second Row - Management & Settings */}
              <div className="relative overflow-hidden rounded-2xl border border-copper-500/30 shadow-2xl shadow-black/30">
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900/95 via-charcoal-950/98 to-charcoal-900/95 backdrop-blur-3xl" />
                
                {/* Subtle Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-transparent to-copper-500/5" />
                
                {/* Content */}
                <div className="relative p-2">
                  <TabsList className="grid grid-cols-5 gap-1.5 bg-transparent w-full p-0">
                    <TabsTrigger 
                      value="manage-events"
                      data-testid="owner-manage-events-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span>Manage Events</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="members"
                      data-testid="members-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      <span>Members</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="analytics"
                      data-testid="analytics-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings"
                      data-testid="settings-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="billing"
                      data-testid="billing-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Billing</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>
            
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
                        communityName={community?.name}
                        communityImageUrl={community?.imageUrl}
                        currentUserId={user?.id}
                        currentUserName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined}
                        currentUserAvatar={user?.profileImageUrl}
                        canEdit={isOwner || post.authorId === user?.id}
                        canDelete={isOwner}
                        onEdit={() => handleEditPost(post)}
                        onDelete={() => {
                          setDeletePostDialog({ open: true, postId: post.id });
                        }}
                        onReaction={(type) => handleReaction(post.id, type)}
                        onComment={(content, parentId) => handleComment(post.id, content, parentId)}
                        onCommentEdit={(commentId, content) => handleCommentEdit(commentId, content)}
                        onCommentDelete={(commentId) => handleCommentDelete(commentId)}
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
                        const currentUserMembership = members.find(m => m.userId === user?.id);
                        const currentUserIsModerator = currentUserMembership?.role === 'moderator';
                        const canManageRole = isOwner && !isCurrentUser && member.role !== 'owner' && member.status === 'approved';
                        const memberName = member.user?.firstName && member.user?.lastName
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.user?.email || 'Unknown User';
                        const memberInitial = (member.user?.firstName?.[0] || member.user?.email?.[0] || 'U').toUpperCase();
                        
                        // Permission logic for removing members:
                        // - Owners can remove moderators and members (not owners)
                        // - Moderators can remove regular members only (not other moderators or owners)
                        const canRemoveMember = !isCurrentUser && member.role !== 'owner' && member.status === 'approved' && (
                          isOwner || (currentUserIsModerator && member.role === 'member')
                        );
                        
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-premium-surface transition-colors"
                            data-testid={`member-item-${member.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.user?.profileImageUrl} />
                                <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white">
                                  {memberInitial}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-premium-text-primary">
                                  {memberName}
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
                                        setPromoteMemberDialog({ open: true, member });
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
                                        setDemoteMemberDialog({ open: true, member });
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
                              
                              {canRemoveMember && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                                  onClick={() => {
                                    setRemoveMemberDialog({ open: true, member });
                                  }}
                                  disabled={removeMemberMutation.isPending}
                                  data-testid={`remove-member-${member.id}`}
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
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
              {!analytics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Total Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold text-accent">
                      {analytics.totalMembers}
                    </p>
                    <p className="text-xs md:text-sm text-premium-text-muted mt-2">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {(analytics.memberGrowthRate * 100).toFixed(0)}% this month
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Total Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold text-accent">
                      {analytics.totalReactions + analytics.totalComments}
                    </p>
                    <p className="text-xs md:text-sm text-premium-text-muted mt-2">
                      <Heart className="h-3 w-3 inline mr-1" />
                      {analytics.avgEngagementPerPost.toFixed(1)} avg per post
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Engagement Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold text-accent">
                      {(analytics.engagementRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs md:text-sm text-premium-text-muted mt-2">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {analytics.engagementTrend.direction === 'growing' ? 'Growing' : analytics.engagementTrend.direction === 'declining' ? 'Declining' : 'Stable'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Retention Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold text-accent">
                      {(analytics.retentionRate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs md:text-sm text-premium-text-muted mt-2">
                      <MessageCircle className="h-3 w-3 inline mr-1" />
                      Active members (30d)
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Post Performance Table */}
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Post Performance</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Top performing posts by engagement</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Post Title</TableHead>
                        <TableHead className="min-w-[80px]">Views</TableHead>
                        <TableHead className="min-w-[90px]">Reactions</TableHead>
                        <TableHead className="min-w-[100px]">Comments</TableHead>
                        <TableHead className="min-w-[130px]">Engagement Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.slice(0, 5).map((post) => {
                        const reactions = post.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
                        const views = post.viewCount || 0;
                        const engagementRate = views > 0 
                          ? ((reactions + (post.comments?.length || 0)) / views * 100).toFixed(1)
                          : '0.0';
                        
                        return (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium text-xs md:text-sm truncate max-w-[200px]">{post.title}</TableCell>
                            <TableCell className="text-xs md:text-sm">{views > 0 ? views : '-'}</TableCell>
                            <TableCell className="text-xs md:text-sm">{reactions}</TableCell>
                            <TableCell className="text-xs md:text-sm">{post.comments?.length || 0}</TableCell>
                            <TableCell className="text-xs md:text-sm">{engagementRate}%</TableCell>
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
                  <CardTitle className="text-base md:text-lg">Best Time to Post</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Based on actual community engagement patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="font-semibold mb-3 text-sm md:text-base">Highest Engagement Days</p>
                      <div className="space-y-2">
                        {analytics.bestTimeToPost.days.length === 0 ? (
                          <p className="text-xs md:text-sm text-premium-text-muted">Not enough data yet</p>
                        ) : (
                          analytics.bestTimeToPost.days.map((day, idx) => (
                            <div key={day.day} className="flex justify-between items-center">
                              <span className="text-xs md:text-sm">{day.day}</span>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-2 bg-gradient-to-r from-copper-500 to-accent rounded" 
                                  style={{ width: `${Math.max(day.percentage * 0.8, 40)}px` }}
                                />
                                <span className="text-xs md:text-sm text-premium-text-muted min-w-[35px] text-right">{day.percentage}%</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-3 text-sm md:text-base">Peak Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {analytics.bestTimeToPost.hours.length === 0 ? (
                          <p className="text-xs md:text-sm text-premium-text-muted">Not enough data yet</p>
                        ) : (
                          analytics.bestTimeToPost.hours.map((hour, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{hour}</Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                </>
              )}
            </TabsContent>
            
            {/* Chat Tab */}
            {activeTab === 'chat' && (
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
            )}
            
            {/* Polls Tab */}
            <TabsContent value="polls" className="space-y-4 md:space-y-6">
              <CommunityPolls 
                communityId={community.id}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role,
                  userId: user?.id || ''
                } : undefined}
              />
            </TabsContent>
            
            {/* Giveaways Tab */}
            <TabsContent value="giveaways" className="space-y-4 md:space-y-6">
              <CommunityGiveaways 
                communityId={community.id}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role,
                  userId: user?.id || ''
                } : undefined}
              />
            </TabsContent>
            
            {/* Events Tab - Public View */}
            <TabsContent value="events" className="space-y-4 md:space-y-6">
              {organizerData?.organizer ? (
                <CommunityTicketedEvents organizerId={organizerData.organizer.id} />
              ) : (
                <Card className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20">
                  <CardContent className="py-12 md:py-16 text-center">
                    <Ticket className="h-12 w-12 md:h-16 md:w-16 text-copper-500/50 mx-auto mb-4" />
                    <h3 className="font-fraunces text-xl md:text-2xl font-semibold text-white mb-2">
                      No Events Yet
                    </h3>
                    <p className="text-premium-text-secondary">
                      This community hasn't set up ticketing yet. Check back later for events!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Manage Events Tab - Owner/Moderator Only */}
            <TabsContent value="manage-events" className="space-y-4 md:space-y-6">
              {/* Setup Status & Guidance */}
              {!organizerData?.organizer ? (
                <Alert className="glass-card border-blue-500/50 bg-blue-500/10">
                  <Ticket className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    <strong className="font-semibold">Event Ticketing Available!</strong> Go to the Settings tab to enable Stripe Connect payment processing. You can create draft events now and publish them once Stripe is connected.
                  </AlertDescription>
                </Alert>
              ) : !organizerData.organizer.stripeOnboardingComplete ? (
                <Alert className="glass-card border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">
                    <strong className="font-semibold">Setup In Progress.</strong> Complete Stripe Connect setup in Settings to accept payments. Draft events can be created now.
                  </AlertDescription>
                </Alert>
              ) : organizerData.organizer.stripeChargesEnabled ? (
                <Alert className="glass-card border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    <strong className="font-semibold">Ticketing Active!</strong> Your Stripe Connect account is ready. Create and sell tickets for your events.
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Events Tab Visibility Toggle */}
              <Card className="glass-card border-copper-500/30">
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-copper-400" />
                        <h3 className="text-base md:text-lg font-semibold text-white">Events Tab Visibility</h3>
                      </div>
                      <p className="text-sm text-premium-text-muted">
                        Control whether the Events tab is visible to community members. When disabled, only moderators and owners can see ticketed events.
                      </p>
                    </div>
                    <Switch
                      checked={community?.showEventsTab ?? true}
                      onCheckedChange={async (checked) => {
                        try {
                          const response = await apiRequest(`/api/communities/${community?.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ showEventsTab: checked }),
                            headers: { 'Content-Type': 'application/json' }
                          });
                          if (response.ok) {
                            queryClient.invalidateQueries({ queryKey: [`/api/communities/${slug}`] });
                            toast({
                              title: checked ? 'Events tab enabled' : 'Events tab hidden',
                              description: checked 
                                ? 'Community members can now see the Events tab' 
                                : 'Events tab is now hidden from members (visible to moderators and owners only)',
                            });
                          }
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to update Events tab visibility',
                            variant: 'destructive'
                          });
                        }
                      }}
                      data-testid="toggle-events-tab-visibility"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Event Stats Overview */}
              {organizerData?.events && organizerData.events.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <Card className="glass-card border-premium-border">
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 rounded-lg bg-copper-500/20">
                          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-copper-400" />
                        </div>
                        <div>
                          <p className="text-xs text-premium-text-muted">Total Events</p>
                          <p className="text-lg md:text-2xl font-bold text-white">{organizerData.events.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-premium-border">
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-premium-text-muted">Published</p>
                          <p className="text-lg md:text-2xl font-bold text-white">
                            {organizerData.events.filter((e: any) => e.status === 'published').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-premium-border">
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/20">
                          <Edit3 className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-xs text-premium-text-muted">Drafts</p>
                          <p className="text-lg md:text-2xl font-bold text-white">
                            {organizerData.events.filter((e: any) => e.status === 'draft').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-premium-border">
                    <CardContent className="pt-4 md:pt-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-premium-text-muted">Upcoming</p>
                          <p className="text-lg md:text-2xl font-bold text-white">
                            {organizerData.events.filter((e: any) => new Date(e.startAt) > new Date()).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Events Dashboard */}
              <Card className="glass-elevated border-premium-border">
                <CardHeader className="border-b border-premium-border/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-copper-400" />
                        Event Management
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm mt-1">
                        Create, edit, and manage all your community events
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setLocation('/tickets/organizer/events/new')}
                        className="touch-target bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-accent/90 text-black font-semibold shadow-lg"
                        data-testid="button-create-event"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Create Event</span>
                        <span className="sm:hidden">New</span>
                      </Button>
                      <Button
                        onClick={() => handleTabChange('settings')}
                        variant="outline"
                        className="touch-target border-premium-border hover:border-copper-500/50"
                        data-testid="button-go-to-settings"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {organizerData?.events && organizerData.events.length > 0 ? (
                    <div className="space-y-4">
                      {organizerData.events.map((event: any) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-premium-surface-elevated/80 to-premium-surface/80 backdrop-blur-xl border border-premium-border hover:border-copper-500/50 shadow-lg hover:shadow-copper-500/20 transition-all duration-300"
                          data-testid={`event-card-${event.id}`}
                        >
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          <div className="relative p-5 md:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                              {/* Event Cover Image */}
                              {event.coverUrl ? (
                                <div className="w-full lg:w-40 h-28 lg:h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-md ring-2 ring-premium-border/50 group-hover:ring-copper-500/50 transition-all">
                                  <img 
                                    src={event.coverUrl} 
                                    alt={event.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              ) : (
                                <div className="w-full lg:w-40 h-28 lg:h-28 rounded-xl bg-gradient-to-br from-copper-500/20 via-copper-600/20 to-accent/20 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-copper-500/20 group-hover:ring-copper-500/40 transition-all">
                                  <Calendar className="h-12 w-12 text-copper-400/60" />
                                </div>
                              )}

                              {/* Event Info */}
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-lg lg:text-xl group-hover:text-copper-400 transition-colors truncate">
                                      {event.title}
                                    </h3>
                                    {event.summary && (
                                      <p className="text-sm text-premium-text-muted mt-1.5 line-clamp-2">
                                        {event.summary}
                                      </p>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={event.status === 'published' ? 'default' : event.status === 'draft' ? 'secondary' : 'outline'}
                                    className={`text-xs font-semibold px-3 py-1 flex-shrink-0 ${
                                      event.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-sm shadow-green-500/20' :
                                      event.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-sm shadow-yellow-500/20' :
                                      'bg-gray-500/20 text-gray-400 border-gray-500/50'
                                    }`}
                                  >
                                    {event.status}
                                  </Badge>
                                </div>

                                {/* Event Meta */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-premium-text-muted">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                                      <Clock className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <span className="font-medium">{new Date(event.startAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}</span>
                                  </div>
                                  {event.venue && (
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-purple-500/10">
                                        <Building2 className="h-4 w-4 text-purple-400" />
                                      </div>
                                      <span className="truncate max-w-[180px] font-medium">{event.venue}</span>
                                    </div>
                                  )}
                                  {event.tiers && event.tiers.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-copper-500/10">
                                        <Ticket className="h-4 w-4 text-copper-400" />
                                      </div>
                                      <span className="font-medium">{event.tiers.length} tier{event.tiers.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex lg:flex-col gap-2.5 lg:items-end">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/tickets/organizer/events/${event.id}/edit`);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 lg:flex-none lg:min-w-[100px] touch-target bg-premium-surface/50 border-premium-border hover:border-copper-500/50 hover:bg-copper-500/10 hover:text-copper-400 text-xs font-semibold shadow-sm"
                                  data-testid={`button-edit-event-${event.id}`}
                                >
                                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                                  Edit
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/events/${event.slug}`, '_blank');
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 lg:flex-none lg:min-w-[100px] touch-target bg-premium-surface/50 border-premium-border hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 text-xs font-semibold shadow-sm"
                                  data-testid={`button-view-event-${event.id}`}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                  View
                                </Button>
                                {event.status === 'published' && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLocation(`/tickets/organizer/events/${event.id}/checkin`);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 lg:flex-none lg:min-w-[100px] touch-target bg-premium-surface/50 border-premium-border hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-400 text-xs font-semibold shadow-sm"
                                    data-testid={`button-checkin-event-${event.id}`}
                                  >
                                    <QrCode className="h-3.5 w-3.5 mr-1.5" />
                                    Check In
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      onClick={(e) => e.stopPropagation()}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 lg:flex-none lg:min-w-[100px] touch-target bg-premium-surface/50 border-premium-border hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-xs font-semibold shadow-sm"
                                      data-testid={`button-delete-event-${event.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-premium-surface border-premium-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-400" />
                                        Delete Event
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-premium-text-muted">
                                        Are you sure you want to delete <span className="font-semibold text-white">"{event.title}"</span>? This action cannot be undone and will permanently remove the event and all associated data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-premium-surface border-premium-border hover:bg-premium-surface-elevated">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          try {
                                            await apiRequest('DELETE', `/api/tickets/events/${event.id}`);
                                            toast({
                                              title: "Event deleted",
                                              description: "The event has been permanently deleted.",
                                            });
                                            queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
                                          } catch (error) {
                                            toast({
                                              title: "Delete failed",
                                              description: "Failed to delete the event. Please try again.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        Delete Event
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-copper-500/10 to-accent/10 mb-4">
                        <Calendar className="h-16 w-16 text-copper-400/50" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
                      <p className="text-sm text-premium-text-muted mb-6 max-w-md mx-auto">
                        Create your first ticketed event and start selling tickets to your community members.
                      </p>
                      <Button
                        onClick={() => setLocation('/tickets/organizer/events/new')}
                        className="touch-target bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-accent/90 text-black font-semibold shadow-lg"
                        data-testid="button-create-first-event"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Event
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Help & Resources */}
              <Card className="glass-card border-premium-border/50">
                <CardHeader>
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Event Ticketing Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs md:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-copper-500/20 flex-shrink-0">
                      <span className="text-copper-400 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Set up Stripe Connect</p>
                      <p className="text-premium-text-muted text-xs mt-0.5">
                        Go to Settings → Ticketing to connect your Stripe account for payment processing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-copper-500/20 flex-shrink-0">
                      <span className="text-copper-400 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Create your event</p>
                      <p className="text-premium-text-muted text-xs mt-0.5">
                        Add event details, set ticket tiers with pricing, capacity, and sale windows
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-copper-500/20 flex-shrink-0">
                      <span className="text-copper-400 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Publish & promote</p>
                      <p className="text-premium-text-muted text-xs mt-0.5">
                        Share your event link with your community and track sales in real-time
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Chat Settings</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Configure chat permissions and moderation settings for your community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6">
                  {/* Chat Mode */}
                  <div>
                    <Label className="text-sm md:text-base">Chat Mode</Label>
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
                    <Label htmlFor="slowmode" className="text-sm md:text-base">Slowmode (seconds between messages)</Label>
                    <Input
                      id="slowmode"
                      type="number"
                      min="0"
                      max="300"
                      value={slowmodeValue}
                      onChange={(e) => {
                        setSlowmodeValue(e.target.value);
                      }}
                      onBlur={() => {
                        const value = parseInt(slowmodeValue) || 0;
                        if (value >= 0 && value <= 300) {
                          updateCommunityMutation.mutate({
                            chatSlowmodeSeconds: value
                          });
                        } else {
                          // Reset to valid value if out of range
                          setSlowmodeValue(String(community?.chatSlowmodeSeconds || 0));
                        }
                      }}
                      placeholder="0 (no slowmode)"
                      className="text-sm md:text-base"
                      data-testid="input-slowmode"
                    />
                    <p className="text-xs md:text-sm text-premium-text-muted mt-1">
                      Set a cooldown period between messages (0-300 seconds)
                    </p>
                  </div>
                  
                  {/* Auto-moderation */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <Label htmlFor="auto-mod" className="text-sm md:text-base">Auto-moderation</Label>
                        <p className="text-xs md:text-sm text-premium-text-muted">
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
                        data-testid="switch-auto-moderation"
                      />
                    </div>
                    
                    {community.autoModeration && (
                      <div>
                        <Label htmlFor="banned-words">Banned Words</Label>
                        <Textarea
                          id="banned-words"
                          placeholder="Enter words separated by commas (e.g., spam, inappropriate, test)"
                          value={bannedWordsValue}
                          onChange={(e) => {
                            setBannedWordsValue(e.target.value);
                          }}
                          onBlur={() => {
                            const trimmedValue = bannedWordsValue.trim();
                            updateCommunityMutation.mutate({
                              bannedWords: trimmedValue
                            });
                          }}
                          className="bg-premium-surface-elevated border-premium-border text-premium-text-primary placeholder:text-premium-text-muted"
                          data-testid="input-banned-words"
                          rows={3}
                        />
                        <p className="text-sm text-premium-text-muted mt-1">
                          Messages containing these words will be blocked
                        </p>
                      </div>
                    )}
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
                  <CardTitle className="text-base md:text-lg">General Settings</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Manage your community's basic settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6">
                  <div>
                    <Label htmlFor="community-name">Community Name</Label>
                    <Input
                      id="community-name"
                      value={communitySettings.name}
                      onChange={(e) => {
                        setCommunitySettings(prev => ({ ...prev, name: e.target.value }));
                      }}
                      onBlur={() => {
                        if (communitySettings.name.trim() && communitySettings.name !== community.name) {
                          updateCommunityMutation.mutate({
                            name: communitySettings.name.trim()
                          });
                        } else if (!communitySettings.name.trim()) {
                          // Reset to original if empty
                          setCommunitySettings(prev => ({ ...prev, name: community.name || '' }));
                        }
                      }}
                      data-testid="input-community-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={communitySettings.description}
                      onChange={(e) => {
                        setCommunitySettings(prev => ({ ...prev, description: e.target.value }));
                      }}
                      onBlur={() => {
                        if (communitySettings.description !== community.description) {
                          updateCommunityMutation.mutate({
                            description: communitySettings.description
                          });
                        }
                      }}
                      rows={4}
                      data-testid="input-community-description"
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

              {/* Join Link Card */}
              <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Community Join Link</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Share this link to invite people to join your community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {permanentInvite ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-premium-surface-elevated border border-premium-border">
                        <Input
                          value={`${window.location.origin}/invite/${permanentInvite.code}`}
                          readOnly
                          className="flex-1 bg-transparent border-none text-premium-text-primary cursor-text"
                          data-testid="input-join-link"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invite/${permanentInvite.code}`);
                            setCopiedInviteLink(true);
                            setTimeout(() => setCopiedInviteLink(false), 2000);
                            toast({ title: "Link copied to clipboard!" });
                          }}
                          className="flex-shrink-0"
                          data-testid="button-copy-link"
                        >
                          {copiedInviteLink ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-premium-text-muted">
                        This permanent link can be used by anyone to join your community. {permanentInvite.currentUses} {permanentInvite.currentUses === 1 ? 'person has' : 'people have'} joined using this link.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-premium-text-muted mb-4">
                        No permanent invite link exists yet. Create one to share with potential members.
                      </p>
                      <Button
                        onClick={() => createInviteLinkMutation.mutate()}
                        disabled={createInviteLinkMutation.isPending}
                        data-testid="button-create-invite-link"
                      >
                        {createInviteLinkMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Create Invite Link
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ticketing Settings Card */}
              {import.meta.env.VITE_ENABLE_TICKETING === 'true' && communitySlug && (
                <TicketingSettingsCard communitySlug={communitySlug} userId={user?.id} />
              )}
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <CommunityBilling
                communityId={community.id}
                communitySlug={community.slug}
                isOwner={isOwner}
              />
            </TabsContent>
          </Tabs>
        ) : (
          // Member view - Posts, Chat, Polls, Giveaways, Events, and Settings
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* Mobile Dropdown Navigation */}
            <div className="md:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full h-14 bg-gradient-to-r from-copper-500/10 via-primary-900/20 to-copper-600/10 border-2 border-copper-500/30 hover:border-copper-400/50 backdrop-blur-2xl shadow-lg shadow-copper-500/10 rounded-2xl transition-all duration-300 text-white font-semibold text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-charcoal-950/98 border-2 border-copper-500/30 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-copper-500/20 min-w-[calc(100vw-2rem)] mt-2">
                  <SelectItem 
                    value="announcements" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      <span>Posts</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="chat" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5" />
                      <span>Chat</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="polls" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Vote className="h-5 w-5" />
                      <span>Polls</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="giveaways" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5" />
                      <span>Giveaways</span>
                    </div>
                  </SelectItem>
                  {(community?.showEventsTab ?? true) && (
                    <SelectItem 
                      value="events" 
                      className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                    >
                      <div className="flex items-center gap-3">
                        <Ticket className="h-5 w-5" />
                        <span>Events</span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem 
                    value="settings" 
                    className="h-14 text-base font-medium text-white hover:bg-gradient-to-r hover:from-copper-500/20 hover:to-copper-600/20 focus:bg-gradient-to-r focus:from-copper-500/30 focus:to-copper-600/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-copper-500 data-[state=checked]:to-copper-600 data-[state=checked]:text-white transition-all duration-200 rounded-xl mx-1 my-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden md:block">
              <div className="bg-gradient-to-br from-charcoal-900/80 via-charcoal-950/90 to-charcoal-900/80 backdrop-blur-2xl rounded-2xl p-2 border-2 border-copper-500/20 shadow-xl shadow-black/20">
                <TabsList className="grid grid-cols-6 gap-2 bg-transparent w-full p-0">
                  <TabsTrigger 
                    value="announcements"
                    data-testid="member-posts-tab"
                    className="relative h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/[0.02] backdrop-blur-sm border border-white/5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500/20 data-[state=active]:to-copper-600/20 data-[state=active]:backdrop-blur-md data-[state=active]:border-copper-500/30 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(192,88,15,0.35)] data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Posts</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chat"
                    data-testid="member-chat-tab"
                    className="relative h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/[0.02] backdrop-blur-sm border border-white/5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500/20 data-[state=active]:to-copper-600/20 data-[state=active]:backdrop-blur-md data-[state=active]:border-copper-500/30 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(192,88,15,0.35)] data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="polls"
                    data-testid="member-polls-tab"
                    className="relative h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/[0.02] backdrop-blur-sm border border-white/5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500/20 data-[state=active]:to-copper-600/20 data-[state=active]:backdrop-blur-md data-[state=active]:border-copper-500/30 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(192,88,15,0.35)] data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    <Vote className="h-4 w-4" />
                    <span>Polls</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="giveaways"
                    data-testid="member-giveaways-tab"
                    className="relative h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/[0.02] backdrop-blur-sm border border-white/5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500/20 data-[state=active]:to-copper-600/20 data-[state=active]:backdrop-blur-md data-[state=active]:border-copper-500/30 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(192,88,15,0.35)] data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    <span>Giveaways</span>
                  </TabsTrigger>
                  {(community?.showEventsTab ?? true) && (
                    <TabsTrigger 
                      value="events"
                      data-testid="member-events-tab"
                      className="h-12 rounded-xl font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500 data-[state=active]:to-copper-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <Ticket className="h-4 w-4" />
                      <span>Events</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="settings"
                    data-testid="member-settings-tab"
                    className="relative h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/[0.02] backdrop-blur-sm border border-white/5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-copper-500/20 data-[state=active]:to-copper-600/20 data-[state=active]:backdrop-blur-md data-[state=active]:border-copper-500/30 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(192,88,15,0.35)] data-[state=active]:scale-[1.02] data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 data-[state=inactive]:hover:backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

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
                        communityName={community?.name}
                        communityImageUrl={community?.imageUrl}
                        currentUserId={user?.id}
                        currentUserName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined}
                        currentUserAvatar={user?.profileImageUrl}
                        canEdit={post.authorId === user?.id}
                        canDelete={false}
                        onReaction={(type) => handleReaction(post.id, type)}
                        onComment={(content, parentId) => handleComment(post.id, content, parentId)}
                        onCommentEdit={(commentId, content) => handleCommentEdit(commentId, content)}
                        onCommentDelete={(commentId) => handleCommentDelete(commentId)}
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
            {activeTab === 'chat' && (
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
            )}

            {/* Polls Tab */}
            <TabsContent value="polls" className="space-y-6">
              <CommunityPolls 
                communityId={community.id}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role as 'member' | 'moderator' | 'owner',
                  userId: user?.id || ''
                } : undefined}
              />
            </TabsContent>

            {/* Giveaways Tab */}
            <TabsContent value="giveaways" className="space-y-6">
              <CommunityGiveaways 
                communityId={community.id}
                currentMember={currentMember && currentMember.status === 'approved' ? {
                  role: currentMember.role as 'member' | 'moderator' | 'owner',
                  userId: user?.id || ''
                } : undefined}
              />
            </TabsContent>

            {/* Events Tab - Member view */}
            <TabsContent value="events" className="space-y-6">
              {organizerData?.organizer ? (
                <CommunityTicketedEvents organizerId={organizerData.organizer.id} />
              ) : (
                <Card className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20">
                  <CardContent className="py-12 md:py-16 text-center">
                    <Ticket className="h-12 w-12 md:h-16 md:w-16 text-copper-500/50 mx-auto mb-4" />
                    <h3 className="font-fraunces text-xl md:text-2xl font-semibold text-white mb-2">
                      No Events Yet
                    </h3>
                    <p className="text-premium-text-secondary">
                      This community hasn't set up ticketing yet. Check back later for events!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Settings Tab - Member notification preferences */}
            <TabsContent value="settings" className="space-y-6">
              <NotificationPreferences 
                communityId={community.id}
                embedded={true}
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
              isPinned: false,
              postAsBusiness: true
            });
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-card border-premium-border max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl md:text-2xl">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Share updates, announcements, or events with your community.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 md:space-y-6">
            {/* Post Type */}
            <div>
              <Label className="text-sm md:text-base">Post Type</Label>
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
              <Label htmlFor="title" className="text-sm md:text-base">Title *</Label>
              <Input
                id="title"
                value={postForm.title}
                onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Give your post a title..."
                className="text-sm md:text-base"
                data-testid="post-title-input"
              />
            </div>
            
            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-sm md:text-base">Content *</Label>
              <Textarea
                id="content"
                value={postForm.content}
                onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your post content... (Markdown supported)"
                rows={6}
                className="text-sm md:text-base"
                data-testid="post-content-input"
              />
            </div>
            
            {/* Media Upload */}
            <div>
              <Label htmlFor="image">Image or Video (optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload an image or video for your announcement
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
            
            {/* Post as Business */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="post-as-business">Post as Business</Label>
                <p className="text-sm text-premium-text-muted">
                  Show community name instead of your personal name
                </p>
              </div>
              <Switch
                id="post-as-business"
                checked={postForm.postAsBusiness}
                onCheckedChange={(checked) => 
                  setPostForm(prev => ({ ...prev, postAsBusiness: checked }))
                }
                data-testid="toggle-post-as-business"
              />
            </div>
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

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={deletePostDialog.open} onOpenChange={(open) => setDeletePostDialog({ open, postId: null })}>
        <AlertDialogContent className="bg-premium-surface border-premium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-premium-text-primary">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-premium-text-secondary">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-premium-border hover:bg-premium-surface-elevated">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePostDialog.postId) {
                  deletePostMutation.mutate(deletePostDialog.postId);
                }
                setDeletePostDialog({ open: false, postId: null });
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-delete-post"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Member Dialog */}
      <AlertDialog open={promoteMemberDialog.open} onOpenChange={(open) => setPromoteMemberDialog({ open, member: null })}>
        <AlertDialogContent className="bg-premium-surface border-premium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-premium-text-primary">Promote to Moderator</AlertDialogTitle>
            <AlertDialogDescription className="text-premium-text-secondary">
              {promoteMemberDialog.member && (
                <>
                  Promote {promoteMemberDialog.member.user?.firstName && promoteMemberDialog.member.user?.lastName
                    ? `${promoteMemberDialog.member.user.firstName} ${promoteMemberDialog.member.user.lastName}`
                    : promoteMemberDialog.member.user?.email || 'this member'} to moderator?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-premium-border hover:bg-premium-surface-elevated">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promoteMemberDialog.member) {
                  updateMemberRoleMutation.mutate({ 
                    userId: promoteMemberDialog.member.userId, 
                    role: 'moderator' 
                  });
                }
                setPromoteMemberDialog({ open: false, member: null });
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              data-testid="confirm-promote-member"
            >
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Member Dialog */}
      <AlertDialog open={demoteMemberDialog.open} onOpenChange={(open) => setDemoteMemberDialog({ open, member: null })}>
        <AlertDialogContent className="bg-premium-surface border-premium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-premium-text-primary">Demote to Member</AlertDialogTitle>
            <AlertDialogDescription className="text-premium-text-secondary">
              {demoteMemberDialog.member && (
                <>
                  Demote {demoteMemberDialog.member.user?.firstName && demoteMemberDialog.member.user?.lastName
                    ? `${demoteMemberDialog.member.user.firstName} ${demoteMemberDialog.member.user.lastName}`
                    : demoteMemberDialog.member.user?.email || 'this member'} to regular member?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-premium-border hover:bg-premium-surface-elevated">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (demoteMemberDialog.member) {
                  updateMemberRoleMutation.mutate({ 
                    userId: demoteMemberDialog.member.userId, 
                    role: 'member' 
                  });
                }
                setDemoteMemberDialog({ open: false, member: null });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="confirm-demote-member"
            >
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeMemberDialog.open} onOpenChange={(open) => setRemoveMemberDialog({ open, member: null })}>
        <AlertDialogContent className="bg-premium-surface border-premium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-premium-text-primary">Remove Member</AlertDialogTitle>
            <AlertDialogDescription className="text-premium-text-secondary">
              {removeMemberDialog.member && (
                <>
                  Remove {removeMemberDialog.member.user?.firstName && removeMemberDialog.member.user?.lastName
                    ? `${removeMemberDialog.member.user.firstName} ${removeMemberDialog.member.user.lastName}`
                    : removeMemberDialog.member.user?.email || 'this member'} from the community? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-premium-border hover:bg-premium-surface-elevated">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeMemberDialog.member) {
                  removeMemberMutation.mutate({ userId: removeMemberDialog.member.userId });
                }
                setRemoveMemberDialog({ open: false, member: null });
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-remove-member"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function TicketingSettingsCard({ communitySlug, userId }: { communitySlug: string; userId?: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);
  const [businessType, setBusinessType] = useState<'individual' | 'company'>('individual');

  // Fetch organizer data - will return null if user hasn't enabled ticketing yet
  const { data: organizerData, isLoading, refetch, error } = useQuery<{ ok: boolean; organizer: any | null }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: !!userId,  // Only fetch if user is logged in
    retry: false,
  });

  // Debug logging
  useEffect(() => {
    console.log('[TicketingSettingsCard] Data:', {
      userId,
      organizerData,
      error,
      isLoading
    });
  }, [userId, organizerData, error, isLoading]);

  const organizer = organizerData?.organizer;
  const hasStripeAccount = !!organizer?.stripeAccountId;
  const isConnected = organizer?.stripeOnboardingComplete && organizer?.stripeChargesEnabled;
  const isPending = hasStripeAccount && !isConnected;

  const handleEnableTicketing = async () => {
    setIsEnabling(true);

    try {
      const response = await fetch('/api/tickets/connect/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/communities/${communitySlug}?tab=settings&ticketing=success`,
          refreshUrl: `${window.location.origin}/communities/${communitySlug}?tab=settings`,
          businessType,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to start onboarding');
      }

      // Store account ID in localStorage to handle status refresh after redirect
      // (even if session is lost during Stripe redirect)
      if (result.accountId) {
        localStorage.setItem('pendingStripeAccountId', result.accountId);
      }

      window.location.href = result.url;
    } catch (error: any) {
      console.error('Enable ticketing error:', error);
      toast({
        title: "Failed to enable ticketing",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsEnabling(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ticketing') === 'success') {
      // Get the stored Stripe account ID from localStorage
      const accountId = localStorage.getItem('pendingStripeAccountId');
      
      // Auto-refresh status from Stripe (works even if session was lost)
      const refreshStatus = async () => {
        try {
          const endpoint = accountId 
            ? `/api/tickets/connect/status?accountId=${accountId}`
            : '/api/tickets/connect/status';
          
          const response = await fetch(endpoint);
          const result = await response.json();
          
          if (result.ok && result.onboardingComplete) {
            toast({
              title: "Ticketing Enabled!",
              description: "Your payment account is fully set up. You can now create ticketed events.",
            });
            // Clear the stored account ID
            localStorage.removeItem('pendingStripeAccountId');
          } else if (result.ok && !result.onboardingComplete) {
            toast({
              title: "Almost there!",
              description: "Stripe is reviewing your information. This usually takes a few minutes.",
            });
          }
          
          // Refetch organizer data to update UI
          refetch();
        } catch (error) {
          console.error('Failed to refresh status:', error);
          toast({
            title: "Setup in progress",
            description: "Click 'Refresh Status' to check if your account is ready.",
          });
        }
      };
      
      refreshStatus();
      window.history.replaceState({}, '', window.location.pathname + '?tab=settings');
    }
  }, [toast, refetch]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-premium-text-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if user has no organizer account at all
  const needsBusinessAccount = !organizer && !isLoading && userId;

  return (
    <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
      <CardHeader>
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Event Ticketing
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Sell tickets for your community events with direct-to-business payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsBusinessAccount ? (
          <>
            <Alert className="bg-blue-500/10 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                You need an approved business account to enable ticketing. Apply for a business account first.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-primary text-sm">Step 1: Apply for Business Account</p>
                  <p className="text-xs text-premium-text-muted">Submit your business information for approval</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-premium-text-muted flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-muted text-sm">Step 2: Get Approved</p>
                  <p className="text-xs text-premium-text-muted">Wait for admin approval (usually within 1-2 business days)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-premium-text-muted flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-muted text-sm">Step 3: Enable Ticketing</p>
                  <p className="text-xs text-premium-text-muted">Connect your Stripe account and start selling tickets</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setLocation('/business-signup')}
              className="w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
              data-testid="button-apply-business-account"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apply for Business Account
            </Button>
          </>
        ) : isPending ? (
          <>
            <Alert className="bg-blue-500/10 border-blue-500/50">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Stripe Connect setup in progress. Complete your onboarding to start accepting payments.
              </AlertDescription>
            </Alert>

            <div className="p-3 rounded-lg bg-premium-surface-elevated border border-premium-border">
              <p className="text-sm font-medium text-premium-text-primary mb-2">Next Steps:</p>
              <ul className="text-xs text-premium-text-muted space-y-1 list-disc list-inside">
                <li>Stripe will verify your information (usually takes a few minutes)</li>
                <li>You'll receive an email when your account is ready</li>
                <li>Once approved, you can create events and sell tickets</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    // Try to use stored account ID if session is lost
                    const storedAccountId = localStorage.getItem('pendingStripeAccountId') || organizer?.stripeAccountId;
                    const endpoint = storedAccountId 
                      ? `/api/tickets/connect/status?accountId=${storedAccountId}`
                      : '/api/tickets/connect/status';
                    
                    // Call the status endpoint to fetch latest from Stripe and update DB
                    const response = await fetch(endpoint);
                    const result = await response.json();
                    
                    if (!result.ok) {
                      throw new Error(result.error || 'Failed to refresh status');
                    }
                    
                    // Refetch organizer data to get updated status
                    await refetch();
                    
                    // Clear stored account ID if onboarding is complete
                    if (result.onboardingComplete) {
                      localStorage.removeItem('pendingStripeAccountId');
                    }
                    
                    toast({
                      title: "Status refreshed",
                      description: result.onboardingComplete 
                        ? "Your Stripe account is now fully set up!" 
                        : "Status updated. Stripe is still reviewing your information.",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Failed to refresh",
                      description: error.message || "Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
                variant="secondary"
                className="flex-1"
                data-testid="button-refresh-status"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/tickets/connect/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      businessType,
                      returnUrl: `${window.location.origin}/communities/${communitySlug}?tab=settings&ticketing=success`,
                      refreshUrl: `${window.location.origin}/communities/${communitySlug}?tab=settings`,
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (result.ok) {
                    window.location.href = result.url;
                  } else {
                    toast({
                      title: "Failed to open Stripe setup",
                      description: result.error || "Please try again",
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error('Failed to open Stripe:', error);
                  toast({
                    title: "Error",
                    description: "Failed to continue setup. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="flex-1"
              data-testid="button-continue-stripe-setup"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue Stripe Setup
            </Button>
            </div>
          </>
        ) : isConnected ? (
          <>
            <Alert className="bg-green-500/10 border-green-500/50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Ticketing is enabled. Payments go directly to your Stripe account with a {((organizer.platformFeeBps || 500) / 100).toFixed(1)}% platform fee.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-premium-surface-elevated border border-premium-border">
                <p className="text-xs text-premium-text-muted mb-1">Charges Enabled</p>
                <p className="font-semibold text-premium-text-primary">{organizer.stripeChargesEnabled ? 'Yes' : 'No'}</p>
              </div>
              <div className="p-3 rounded-lg bg-premium-surface-elevated border border-premium-border">
                <p className="text-xs text-premium-text-muted mb-1">Payouts Enabled</p>
                <p className="font-semibold text-premium-text-primary">{organizer.stripePayoutsEnabled ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setLocation('/tickets/organizer/dashboard')}
                variant="default"
                className="flex-1"
                data-testid="button-manage-ticketing"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Events
              </Button>
              <Button
                onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                variant="outline"
                className="flex-1"
                data-testid="button-stripe-dashboard"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert className="bg-copper-500/10 border-copper-500/50">
              <AlertCircle className="h-4 w-4 text-copper-500" />
              <AlertDescription className="text-copper-700 dark:text-copper-400">
                Enable ticketing to sell tickets for community events and accept payments directly.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-primary text-sm">Direct Payments</p>
                  <p className="text-xs text-premium-text-muted">Money goes straight to your Stripe account</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-primary text-sm">Instant Payouts</p>
                  <p className="text-xs text-premium-text-muted">No waiting for platform payouts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-premium-text-primary text-sm">Full Control</p>
                  <p className="text-xs text-premium-text-muted">Manage pricing, refunds, and analytics</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3 rounded-lg bg-premium-surface-elevated border border-premium-border">
              <p className="text-sm font-medium text-premium-text-primary">Account Type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBusinessType('individual')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    businessType === 'individual'
                      ? 'border-copper-500 bg-copper-500/10'
                      : 'border-premium-border bg-premium-surface hover:border-premium-border-hover'
                  }`}
                  data-testid="select-individual-account"
                >
                  <p className="font-semibold text-sm text-premium-text-primary">Individual</p>
                  <p className="text-xs text-premium-text-muted mt-1">Sole proprietor, freelancer</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ SIN + bank info only</p>
                </button>
                <button
                  onClick={() => setBusinessType('company')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    businessType === 'company'
                      ? 'border-copper-500 bg-copper-500/10'
                      : 'border-premium-border bg-premium-surface hover:border-premium-border-hover'
                  }`}
                  data-testid="select-company-account"
                >
                  <p className="font-semibold text-sm text-premium-text-primary">Company</p>
                  <p className="text-xs text-premium-text-muted mt-1">Incorporated business</p>
                  <p className="text-xs text-premium-text-muted mt-1">Business registration needed</p>
                </button>
              </div>
              <p className="text-xs text-premium-text-muted">
                {businessType === 'individual' 
                  ? "Perfect for unincorporated event organizers. Stripe will ask for your SIN and bank details."
                  : "For registered businesses. Stripe will ask for business registration documents."}
              </p>
            </div>

            <Button
              onClick={handleEnableTicketing}
              disabled={isEnabling}
              className="w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700"
              data-testid="button-enable-ticketing"
            >
              {isEnabling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to Stripe...
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  Enable Ticketing
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}