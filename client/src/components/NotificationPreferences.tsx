import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Bell, Mail, Smartphone, Clock, Sun, Moon,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CommunityNotificationPreferences, Community } from '@shared/schema';

// Timezone list (common ones)
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// Form schema
const preferencesFormSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  newPosts: z.boolean(),
  postComments: z.boolean(),
  commentReplies: z.boolean(),
  mentions: z.boolean(),
  pollResults: z.boolean(),
  membershipUpdates: z.boolean(),
  communityAnnouncements: z.boolean(),
  newDeals: z.boolean(),
  emailFrequency: z.enum(['immediate', 'daily', 'weekly']),
  emailDigestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  emailDigestTimezone: z.string(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

interface NotificationPreferencesProps {
  communityId?: string;
  embedded?: boolean;
}

export function NotificationPreferences({ communityId, embedded = false }: NotificationPreferencesProps) {
  const [selectedCommunity, setSelectedCommunity] = useState<string>(communityId || 'global');
  const { toast } = useToast();

  // Fetch user's communities
  const { data: communitiesData } = useQuery({
    queryKey: ['/api/communities/my'],
    enabled: !communityId,
  });

  // Fetch current preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences', selectedCommunity],
    queryFn: async () => {
      const url = selectedCommunity === 'global' 
        ? '/api/notifications/preferences'
        : `/api/notifications/preferences?communityId=${selectedCommunity}`;
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (values: PreferencesFormValues) => {
      const data = selectedCommunity === 'global' 
        ? values 
        : { ...values, communityId: selectedCommunity };
      
      return apiRequest('/api/notifications/preferences', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    },
  });

  // Form setup
  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      newPosts: true,
      postComments: true,
      commentReplies: true,
      mentions: true,
      pollResults: true,
      membershipUpdates: true,
      communityAnnouncements: true,
      newDeals: true,
      emailFrequency: 'immediate',
      emailDigestTime: '09:00',
      emailDigestTimezone: 'America/Vancouver',
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    },
  });

  // Update form when preferences data loads
  useEffect(() => {
    if (preferencesData?.preferences) {
      const prefs = preferencesData.preferences;
      form.reset({
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? true,
        pushEnabled: prefs.pushEnabled ?? false,
        newPosts: prefs.newPosts ?? true,
        postComments: prefs.postComments ?? true,
        commentReplies: prefs.commentReplies ?? true,
        mentions: prefs.mentions ?? true,
        pollResults: prefs.pollResults ?? true,
        membershipUpdates: prefs.membershipUpdates ?? true,
        communityAnnouncements: prefs.communityAnnouncements ?? true,
        newDeals: prefs.newDeals ?? true,
        emailFrequency: prefs.emailFrequency ?? 'immediate',
        emailDigestTime: prefs.emailDigestTime ?? '09:00',
        emailDigestTimezone: prefs.emailDigestTimezone ?? 'America/Vancouver',
        quietHoursEnabled: prefs.quietHoursEnabled ?? false,
        quietHoursStart: prefs.quietHoursStart ?? '22:00',
        quietHoursEnd: prefs.quietHoursEnd ?? '08:00',
      });
    }
  }, [preferencesData, form]);

  const onSubmit = (values: PreferencesFormValues) => {
    updatePreferencesMutation.mutate(values);
  };

  const containerClass = embedded ? '' : 'container mx-auto py-8 px-4 max-w-4xl';

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-preferences-title">
            <Bell className="h-8 w-8" />
            Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize how and when you receive notifications
          </p>
        </div>
      )}

      {!communityId && communitiesData?.communities && communitiesData.communities.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Scope</CardTitle>
            <CardDescription>
              Choose global settings or customize for specific communities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
              <SelectTrigger data-testid="select-community-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Settings</SelectItem>
                {communitiesData.communities.map((community: Community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="channels" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="types">Notification Types</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            {/* Channels Tab */}
            <TabsContent value="channels" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="inAppEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            In-App Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive notifications within the application
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-in-app"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emailEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive notifications via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-email"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pushEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-4 border rounded-lg opacity-50">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Push Notifications
                            <Badge variant="secondary">Coming Soon</Badge>
                          </FormLabel>
                          <FormDescription>
                            Receive push notifications on your device
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled
                            data-testid="switch-push"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Types Tab */}
            <TabsContent value="types" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>
                    Choose which types of notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="newPosts"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>New Posts</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-new-posts"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postComments"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Comments on Your Posts</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-post-comments"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="commentReplies"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Replies to Your Comments</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-comment-replies"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mentions"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Mentions</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-mentions"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pollResults"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Poll Results</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-poll-results"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="membershipUpdates"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Membership Updates</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-membership"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="communityAnnouncements"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>Community Announcements</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-announcements"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newDeals"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>New Deals & Offers</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-deals"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Frequency</CardTitle>
                  <CardDescription>
                    How often should we send you email notifications?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Digest</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {(form.watch('emailFrequency') === 'daily' || form.watch('emailFrequency') === 'weekly') && (
                    <>
                      <FormField
                        control={form.control}
                        name="emailDigestTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Digest Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                data-testid="input-digest-time"
                              />
                            </FormControl>
                            <FormDescription>
                              When should we send your digest email?
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailDigestTimezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-timezone">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timezones.map(tz => (
                                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quiet Hours</CardTitle>
                  <CardDescription>
                    Pause notifications during specific hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="quietHoursEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Quiet Hours</FormLabel>
                          <FormDescription>
                            Don't send email notifications during quiet hours
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-quiet-hours"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('quietHoursEnabled') && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quietHoursStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Start Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                data-testid="input-quiet-start"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quietHoursEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              End Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                data-testid="input-quiet-end"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              data-testid="button-reset"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={updatePreferencesMutation.isPending}
              data-testid="button-save"
            >
              {updatePreferencesMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Preferences
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}