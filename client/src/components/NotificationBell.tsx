import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2, Trash2, Eye } from 'lucide-react';
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
  'post_published': '📝',
  'membership_approved': '✅',
  'comment_reply': '💬',
  'post_comment': '💬',
  'poll_closed': '📊',
  'mention': '👋',
  'chat_mention': '@',
  'community_announcement': '📢',
  'new_deal': '🎉',
  'test': '🔔',
};

// Color mapping for notification types
const notificationColors: Record<string, string> = {
  'post_published': 'text-blue-600',
  'membership_approved': 'text-green-600',
  'comment_reply': 'text-indigo-600',
  'post_comment': 'text-indigo-600',
  'poll_closed': 'text-purple-600',
  'mention': 'text-yellow-600',
  'chat_mention': 'text-yellow-600',
  'community_announcement': 'text-red-600',
  'new_deal': 'text-emerald-600',
  'test': 'text-gray-600',
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
      return apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH');
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
      return apiRequest('/api/notifications/read-all', 'PATCH');
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
      return apiRequest(`/api/notifications/${notificationId}`, 'DELETE');
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
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
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
      
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          
          {!isLoading && allNotifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          )}
          
          {!isLoading && allNotifications.length > 0 && (
            <>
              {allNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer ${!notification.isRead ? 'bg-accent' : ''}`}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className={`text-2xl ${notificationColors[notification.type] || 'text-gray-600'}`}>
                      {notificationIcons[notification.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        data-testid={`button-delete-${notification.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              
              {data?.hasMore && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
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
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="cursor-pointer" data-testid="link-all-notifications">
            <span className="text-sm">View all notifications</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}