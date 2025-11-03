import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell, 
  CheckCheck, 
  Loader2, 
  Trash2, 
  Eye, 
  Filter, 
  Search,
  Settings, 
  Archive, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  CheckCircle,
  MessageCircle,
  BarChart3,
  AtSign,
  Megaphone,
  Sparkles,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import type { CommunityNotification, Community } from '@shared/schema';

// Icon components (same as NotificationBell)
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

// Premium dark-mode colors
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

// Background colors for cards
const notificationBgColors: Record<string, string> = {
  'post_published': 'bg-blue-500/5 dark:bg-blue-500/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border-blue-500/20',
  'membership_approved': 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 border-emerald-500/20',
  'comment_reply': 'bg-violet-500/5 dark:bg-violet-500/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/10 border-violet-500/20',
  'post_comment': 'bg-violet-500/5 dark:bg-violet-500/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/10 border-violet-500/20',
  'poll_closed': 'bg-purple-500/5 dark:bg-purple-500/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/10 border-purple-500/20',
  'mention': 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 border-amber-500/20',
  'chat_mention': 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 border-amber-500/20',
  'community_announcement': 'bg-rose-500/5 dark:bg-rose-500/5 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 border-rose-500/20',
  'new_deal': 'bg-cyan-500/5 dark:bg-cyan-500/5 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 border-cyan-500/20',
  'role_updated': 'bg-indigo-500/5 dark:bg-indigo-500/5 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10 border-indigo-500/20',
  'test': 'bg-gray-500/5 dark:bg-gray-500/5 hover:bg-gray-500/10 dark:hover:bg-gray-500/10 border-gray-500/20',
};

const notificationTypeLabels: Record<string, string> = {
  'post_published': 'New Posts',
  'membership_approved': 'Membership',
  'comment_reply': 'Replies',
  'post_comment': 'Comments',
  'poll_closed': 'Polls',
  'mention': 'Mentions',
  'chat_mention': 'Chat Mentions',
  'community_announcement': 'Announcements',
  'new_deal': 'Deals',
  'test': 'Test',
};

interface NotificationsResponse {
  ok: boolean;
  notifications: CommunityNotification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export function NotificationCenter() {
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCommunity, setFilterCommunity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const limit = 20;

  // Fetch user's communities for filter
  const { data: communitiesData } = useQuery<{ ok: boolean; communities: Community[] }>({
    queryKey: ['/api/user/communities'],
  });

  // Fetch notifications with filters
  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications', page, filterStatus, filterCommunity],
    queryFn: async () => {
      let url = `/api/notifications?limit=${limit}&offset=${page * limit}`;
      if (filterStatus === 'unread') url += '&unread_only=true';
      if (filterCommunity !== 'all') url = `/api/communities/${filterCommunity}/notifications?limit=${limit}&offset=${page * limit}`;
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const promises = notificationIds.map(id =>
        apiRequest('PATCH', `/api/notifications/${id}/read`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: 'Success',
        description: `Marked ${selectedNotifications.size} notification(s) as read`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', '/api/notifications/read-all', {
        communityId: filterCommunity !== 'all' ? filterCommunity : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive'
      });
    }
  });

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const promises = notificationIds.map(id =>
        apiRequest('DELETE', `/api/notifications/${id}`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: 'Success',
        description: `Deleted ${selectedNotifications.size} notification(s)`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive'
      });
    }
  });

  // Filter notifications based on search and type
  const filteredNotifications = data?.notifications.filter(notification => {
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !notification.body?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && notification.type !== filterType) {
      return false;
    }
    return true;
  }) || [];

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  // Handle individual selection
  const handleSelectNotification = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  // Handle bulk actions
  const handleBulkMarkAsRead = () => {
    if (selectedNotifications.size > 0) {
      markAsReadMutation.mutate(Array.from(selectedNotifications));
    }
  };

  const handleBulkDelete = () => {
    if (selectedNotifications.size > 0) {
      deleteNotificationsMutation.mutate(Array.from(selectedNotifications));
    }
  };

  // Handle notification card click - navigate and mark as read
  const handleNotificationClick = (notification: CommunityNotification) => {
    if (notification.actionUrl) {
      // Mark as read if unread
      if (!notification.isRead) {
        apiRequest('PATCH', `/api/notifications/${notification.id}/read`)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          })
          .catch(console.error);
      }
      
      // Navigate to the action URL
      setLocation(notification.actionUrl);
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Notification Center
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80 mt-2 ml-13 sm:ml-15">
            Manage all your notifications in one place
          </p>
        </div>
        <Link href="/account/profile#notifications">
          <Button variant="outline" size="sm" data-testid="button-settings" className="w-full sm:w-auto hover:bg-white/5 border-white/10">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/30 transition-colors">
          <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400" data-testid="text-total-count">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border-amber-500/20 hover:border-amber-500/30 transition-colors">
          <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400" data-testid="text-unread-count">
              {data?.unreadCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-600/5 border-violet-500/20 hover:border-violet-500/30 transition-colors">
          <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Selected</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-violet-400" data-testid="text-selected-count">
              {selectedNotifications.size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="select-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(notificationTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {communitiesData?.communities && (
              <Select value={filterCommunity} onValueChange={setFilterCommunity}>
                <SelectTrigger data-testid="select-community">
                  <SelectValue placeholder="All communities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All communities</SelectItem>
                  {communitiesData.communities.map((community: Community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
                <SelectItem value="read">Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <Card className="mb-4 bg-accent">
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
            <span className="text-sm font-medium">
              {selectedNotifications.size} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkMarkAsRead}
                disabled={markAsReadMutation.isPending}
                data-testid="button-bulk-read"
                className="flex-1 sm:flex-initial"
              >
                <Eye className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Mark as read</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={deleteNotificationsMutation.isPending}
                data-testid="button-bulk-delete"
                className="flex-1 sm:flex-initial"
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Delete</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Notifications</CardTitle>
            {data?.unreadCount !== undefined && data.unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
                className="w-full sm:w-auto"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center border border-white/10">
                <Bell className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-base font-medium text-muted-foreground mb-1">No notifications found</p>
              <p className="text-sm text-muted-foreground/60 mb-4">
                {(searchQuery || filterType !== 'all' || filterStatus !== 'all') 
                  ? 'Try adjusting your filters' 
                  : 'You\'re all caught up'}
              </p>
              {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 hover:bg-white/5 border-white/10"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterStatus('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2 pb-2 border-b">
                <Checkbox
                  checked={selectedNotifications.size === filteredNotifications.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
              
              {filteredNotifications.map((notification) => {
                const IconComponent = notificationIcons[notification.type] || Bell;
                const bgColor = notificationBgColors[notification.type] || 'bg-gray-500/5 hover:bg-gray-500/10 border-gray-500/20';
                const iconColor = notificationColors[notification.type] || 'text-gray-400';
                
                return (
                  <div
                    key={notification.id}
                    className={`relative flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border transition-all duration-200 ${bgColor} ${
                      selectedNotifications.has(notification.id) ? 'ring-2 ring-amber-500/50 ring-inset' : ''
                    }`}
                    data-testid={`notification-card-${notification.id}`}
                  >
                    {!notification.isRead && (
                      <div className="absolute left-2 top-6 w-2 h-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50" />
                    )}
                    
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNotifications.has(notification.id)}
                        onCheckedChange={() => handleSelectNotification(notification.id)}
                        data-testid={`checkbox-notification-${notification.id}`}
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div 
                      onClick={notification.actionUrl ? () => handleNotificationClick(notification) : undefined}
                      className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center border border-white/10 ${iconColor} ${notification.actionUrl ? 'cursor-pointer' : ''}`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3">
                        <div 
                          onClick={notification.actionUrl ? () => handleNotificationClick(notification) : undefined}
                          className={`flex-1 ${notification.actionUrl ? 'cursor-pointer' : ''}`}
                        >
                          <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1.5 line-clamp-2">
                            {notification.title}
                          </h3>
                          {notification.body && (
                            <p className="text-xs sm:text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
                              {notification.body}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                            <Badge variant="outline" className="text-xs bg-white/5 border-white/10">
                              {notificationTypeLabels[notification.type] || notification.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground/70 font-medium">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            {!notification.isRead && (
                              <Badge className="text-xs bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30">
                                Unread
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate([notification.id])}
                              data-testid={`button-mark-read-${notification.id}`}
                              className="h-8 px-3 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              <span className="text-xs">Mark read</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotificationsMutation.mutate([notification.id])}
                            data-testid={`button-delete-${notification.id}`}
                            className="h-8 px-3 hover:bg-white/5 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            <span className="text-xs">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 sm:mt-6 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="button-prev-page"
                className="flex-1 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {page + 1} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data?.hasMore}
                data-testid="button-next-page"
                className="flex-1 sm:flex-initial"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationCenter;