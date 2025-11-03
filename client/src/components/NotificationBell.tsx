import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Loader2, 
  Trash2, 
  Eye, 
  FileText, 
  CheckCircle, 
  MessageCircle, 
  BarChart3, 
  AtSign, 
  Megaphone, 
  Sparkles,
  Users
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import type { CommunityNotification } from '@shared/schema';

// Icon mapping for notification types
const notificationIcons: Record<string, any> = {
  'post_published': FileText,
  'membership_approved': CheckCircle,
  'comment_reply': MessageCircle,
  'post_comment': MessageCircle,
  'poll_closed': BarChart3,
  'mention': AtSign,
  'chat_mention': AtSign,
  'community_announcement': Megaphone,
  'new_deal': Sparkles,
  'role_updated': Users,
  'test': Bell,
};

// Color mapping for notification types (subtle, premium colors)
const notificationColors: Record<string, string> = {
  'post_published': 'text-blue-400 dark:text-blue-400',
  'membership_approved': 'text-emerald-400 dark:text-emerald-400',
  'comment_reply': 'text-violet-400 dark:text-violet-400',
  'post_comment': 'text-violet-400 dark:text-violet-400',
  'poll_closed': 'text-purple-400 dark:text-purple-400',
  'mention': 'text-amber-400 dark:text-amber-400',
  'chat_mention': 'text-amber-400 dark:text-amber-400',
  'community_announcement': 'text-rose-400 dark:text-rose-400',
  'new_deal': 'text-cyan-400 dark:text-cyan-400',
  'role_updated': 'text-indigo-400 dark:text-indigo-400',
  'test': 'text-gray-400 dark:text-gray-400',
};

// Background colors for notification types (very subtle)
const notificationBgColors: Record<string, string> = {
  'post_published': 'bg-blue-500/5 dark:bg-blue-500/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/10',
  'membership_approved': 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10',
  'comment_reply': 'bg-violet-500/5 dark:bg-violet-500/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/10',
  'post_comment': 'bg-violet-500/5 dark:bg-violet-500/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/10',
  'poll_closed': 'bg-purple-500/5 dark:bg-purple-500/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/10',
  'mention': 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/10',
  'chat_mention': 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/10',
  'community_announcement': 'bg-rose-500/5 dark:bg-rose-500/5 hover:bg-rose-500/10 dark:hover:bg-rose-500/10',
  'new_deal': 'bg-cyan-500/5 dark:bg-cyan-500/5 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10',
  'role_updated': 'bg-indigo-500/5 dark:bg-indigo-500/5 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10',
  'test': 'bg-gray-500/5 dark:bg-gray-500/5 hover:bg-gray-500/10 dark:hover:bg-gray-500/10',
};

interface NotificationsResponse {
  ok: boolean;
  notifications: CommunityNotification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [allNotifications, setAllNotifications] = useState<CommunityNotification[]>([]);
  const { toast } = useToast();
  const limit = 20;

  // Query for notifications
  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications', page],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?limit=${limit}&offset=${page * limit}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 30000, // Auto-refetch every 30 seconds for real-time updates
  });

  // Mutation to mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    }
  });

  // Mutation to mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
      setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      });
    }
  });

  // Mutation to delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setAllNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: 'Deleted',
        description: 'Notification deleted',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  });

  // Update notifications when data changes
  useEffect(() => {
    if (data?.notifications) {
      if (page === 0) {
        setAllNotifications(data.notifications);
      } else {
        setAllNotifications(prev => [...prev, ...data.notifications]);
      }
    }
  }, [data, page]);

  // Note: Real-time WebSocket updates disabled for now
  // The platform uses session-based auth, not token-based auth
  // Will implement platform-wide notifications WebSocket in the future

  // Handle notification click
  const handleNotificationClick = async (notification: CommunityNotification) => {
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
    
    setIsOpen(false);
  };

  // Load more notifications
  const loadMore = () => {
    if (data?.hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, yyyy');
  };

  const unreadCount = data?.unreadCount || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[420px] p-0 bg-background/95 backdrop-blur-xl border border-white/10">
        <DropdownMenuLabel className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30 px-2 h-5">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-8 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <ScrollArea className="h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          
          {!isLoading && allNotifications.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center border border-white/10">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">All caught up</p>
              <p className="text-xs text-muted-foreground/60">No new notifications</p>
            </div>
          )}
          
          {!isLoading && allNotifications.length > 0 && (
            <>
              {allNotifications.map((notification) => {
                const IconComponent = notificationIcons[notification.type] || Bell;
                const bgColor = notificationBgColors[notification.type] || 'hover:bg-accent';
                const iconColor = notificationColors[notification.type] || 'text-gray-400';
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-0 cursor-pointer border-b border-border/50 last:border-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-inset ${bgColor}`}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex items-start gap-4 w-full p-4 relative">
                      {!notification.isRead && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50" />
                      )}
                      
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center border border-white/10 ${iconColor}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-2 font-medium">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                          data-testid={`button-delete-${notification.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
              
              {data?.hasMore && (
                <div className="p-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-white/5 border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={loadMore}
                    data-testid="button-load-more"
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
        
        <div className="border-t border-border/50">
          <DropdownMenuItem asChild className="m-0 rounded-none hover:bg-white/5 transition-colors">
            <Link href="/notifications" className="cursor-pointer px-5 py-3 flex items-center justify-center" data-testid="link-all-notifications">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">View all notifications</span>
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}