import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Bell, CheckCheck, Loader2, Trash2, Eye, Filter, Search,
  Settings, Archive, ChevronLeft, ChevronRight
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
import { Link } from 'wouter';
import type { CommunityNotification, Community } from '@shared/schema';

// Icon and color mappings (same as NotificationBell)
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

const notificationColors: Record<string, string> = {
  'post_published': 'bg-blue-50 border-blue-200',
  'membership_approved': 'bg-green-50 border-green-200',
  'comment_reply': 'bg-indigo-50 border-indigo-200',
  'post_comment': 'bg-indigo-50 border-indigo-200',
  'poll_closed': 'bg-purple-50 border-purple-200',
  'mention': 'bg-yellow-50 border-yellow-200',
  'chat_mention': 'bg-yellow-50 border-yellow-200',
  'community_announcement': 'bg-red-50 border-red-200',
  'new_deal': 'bg-emerald-50 border-emerald-200',
  'test': 'bg-gray-50 border-gray-200',
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
        apiRequest(`/api/notifications/${id}/read`, 'PATCH')
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
      return apiRequest('/api/notifications/read-all', 'PATCH', {
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
        apiRequest(`/api/notifications/${id}`, 'DELETE')
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

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8" />
            Notification Center
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage all your notifications
          </p>
        </div>
        <Link href="/account/profile#notifications">
          <Button variant="outline" size="sm" data-testid="button-settings" className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-count">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-blue-600" data-testid="text-unread-count">
              {data?.unreadCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold" data-testid="text-selected-count">
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
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications found</p>
              {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterStatus('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear filters
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
              
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border transition-colors ${
                    !notification.isRead ? 'bg-accent' : ''
                  } ${notificationColors[notification.type] || 'bg-gray-50 border-gray-200'} ${
                    selectedNotifications.has(notification.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  data-testid={`notification-card-${notification.id}`}
                >
                  <Checkbox
                    checked={selectedNotifications.has(notification.id)}
                    onCheckedChange={() => handleSelectNotification(notification.id)}
                    data-testid={`checkbox-notification-${notification.id}`}
                    className="mt-0.5"
                  />
                  
                  <span className="text-xl sm:text-2xl">
                    {notificationIcons[notification.type] || '🔔'}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm sm:text-base">{notification.title}</h3>
                        {notification.body && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {notification.body}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notificationTypeLabels[notification.type] || notification.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), 'PPp')}
                          </span>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">
                              Unread
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {notification.actionUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`button-view-${notification.id}`}
                            className="h-8 text-xs"
                          >
                            <Link href={notification.actionUrl}>View</Link>
                          </Button>
                        )}
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate([notification.id])}
                            data-testid={`button-mark-read-${notification.id}`}
                            className="h-8 px-2"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotificationsMutation.mutate([notification.id])}
                          data-testid={`button-delete-${notification.id}`}
                          className="h-8 px-2"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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