import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Calendar, 
  Plus, 
  DollarSign, 
  Users, 
  BarChart3,
  Settings,
  Ticket,
  Eye,
  Edit,
  Copy,
  Archive,
  MoreVertical,
  Clock,
  ChevronRight,
  ExternalLink,
  Download,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface TicketTier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number | null;
  soldCount: number;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  status: 'draft' | 'published' | 'archived';
  startAt: string;
  endAt?: string;
  venue: string;
  address?: string;
  city: string;
  province: string;
  coverUrl?: string;
  createdAt: string;
  tiers?: TicketTier[];
  stats?: {
    ticketsSold: number;
    totalCapacity: number;
    revenue: number;
    views: number;
  };
}

interface Organizer {
  id: string;
  businessName: string;
  businessEmail: string;
  stripeAccountId: string | null;
  platformFeeBps: number;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  status: 'active' | 'suspended' | 'pending';
}

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  upcomingEvents: number;
  pastEvents: number;
}

export function TicketsOrganizerDashboard() {
  const { toast } = useToast();
  
  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  // Wait for user session to be ready before fetching organizer data
  const { data: userData, isLoading: isLoadingUser } = useQuery<{ ok: boolean; user: any }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  
  const isUserReady = !isLoadingUser && !!userData?.user;
  
  // Get organizer data from approved business account
  const { data, isLoading, error, refetch } = useQuery<{ 
    ok: boolean; 
    organizer: Organizer; 
    events: Event[];
    stats: DashboardStats;
  }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled && isUserReady,
    retry: false,
  });

  const organizer = data?.organizer;
  const organizerId = organizer?.id;

  const duplicateEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/tickets/events/${eventId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-id': organizerId || ''
        }
      });
      if (!response.ok) throw new Error('Failed to duplicate event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
      toast({
        title: "Event duplicated",
        description: "Your event has been duplicated successfully. Edit the new event to update details."
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Failed to duplicate event",
        description: "An error occurred while duplicating the event",
        variant: "destructive"
      });
    }
  });

  const archiveEventMutation = useMutation({
    mutationFn: async ({ eventId, archive }: { eventId: string; archive: boolean }) => {
      const response = await fetch(`/api/tickets/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-id': organizerId || ''
        },
        body: JSON.stringify({ status: archive ? 'archived' : 'published' })
      });
      if (!response.ok) throw new Error('Failed to update event status');
      return response.json();
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
      toast({
        title: archive ? "Event archived" : "Event unarchived",
        description: archive 
          ? "Event has been archived and is no longer visible to customers"
          : "Event is now active and visible to customers"
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Failed to update event",
        description: "An error occurred while updating the event status",
        variant: "destructive"
      });
    }
  });

  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Coming Soon</h1>
        <p className="text-lg text-muted-foreground">
          The organizer portal will be available soon.
        </p>
      </div>
    );
  }

  if (!organizer && !isLoading && !isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-fraunces mb-4">Business Account Required</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You need an approved business account to access the organizer dashboard and manage events.
        </p>
        <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold mb-4">How to Get Started:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Apply for a business account at /business-signup</li>
            <li>Wait for admin approval (usually 1-2 business days)</li>
            <li>Return here to manage your events and ticketing</li>
          </ol>
        </div>
        <Link href="/business-signup">
          <Button size="lg" data-testid="button-apply-business">
            Apply for Business Account
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal-gradient">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <Skeleton className="h-12 w-96 max-w-full mb-8 rounded-xl" style={{ background: 'var(--charcoal-elevated)' }} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-elevated rounded-xl p-5">
                <Skeleton className="h-4 w-24 mb-3 rounded" style={{ background: 'var(--charcoal-surface)' }} />
                <Skeleton className="h-10 w-20 mb-2 rounded" style={{ background: 'var(--charcoal-surface)' }} />
                <Skeleton className="h-3 w-16 rounded" style={{ background: 'var(--charcoal-surface)' }} />
              </div>
            ))}
          </div>
          <div className="glass-elevated rounded-xl p-6">
            <Skeleton className="h-8 w-48 mb-6 rounded-lg" style={{ background: 'var(--charcoal-surface)' }} />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" style={{ background: 'var(--charcoal-surface)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Unable to load dashboard</h1>
        <p className="text-muted-foreground">Please try again later.</p>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const events: Event[] = data?.events || [];
  const stats: DashboardStats = data?.stats || {
    totalEvents: events.length,
    activeEvents: events.filter(e => e.status === 'published').length,
    totalTicketsSold: 0,
    totalRevenue: 0,
    upcomingEvents: events.filter(e => new Date(e.startAt) > new Date()).length,
    pastEvents: events.filter(e => new Date(e.startAt) <= new Date()).length
  };

  const upcomingEvents = events
    .filter(e => new Date(e.startAt) > new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const pastEvents = events
    .filter(e => new Date(e.startAt) <= new Date())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const draftEvents = events.filter(e => e.status === 'draft');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" data-testid="badge-published">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>;
      case 'draft':
        return <Badge variant="secondary" data-testid="badge-draft">
          <Edit className="w-3 h-3 mr-1" />
          Draft
        </Badge>;
      case 'archived':
        return <Badge variant="outline" data-testid="badge-archived">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-gradient">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Premium Header */}
        <div className="mb-8 md:mb-12 animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-8 bg-copper-gradient rounded-full" />
            <h1 className="text-3xl md:text-5xl font-fraunces font-bold" style={{ color: 'var(--neutral-50)' }}>
              Organizer <span className="text-copper-gradient">Dashboard</span>
            </h1>
          </div>
          <p className="text-base md:text-lg ml-5" style={{ color: 'var(--neutral-300)' }}>
            Welcome back, {organizer?.businessName}
          </p>
        </div>

        {/* Stripe Connect Status */}
        {!organizer?.stripeOnboardingComplete ? (
          <div className="mb-8 glass-elevated rounded-xl p-6 border-2 animate-slideUp" style={{ borderColor: 'var(--copper)', background: 'var(--copper-glow)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                  <h3 className="text-lg font-fraunces font-semibold" style={{ color: 'var(--neutral-50)' }}>
                    Complete Stripe Setup
                  </h3>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--neutral-300)' }}>
                  Connect your Stripe account to start accepting payments for your events.
                </p>
                <p className="text-xs" style={{ color: 'var(--neutral-400)' }}>
                  You need to complete Stripe Connect onboarding before you can sell tickets.
                </p>
              </div>
              <Link href="/tickets/organizer/connect">
                <Button 
                  className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target whitespace-nowrap"
                  data-testid="button-connect-stripe"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Connect Stripe
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-8 glass-elevated rounded-xl p-6 border-2 animate-slideUp" style={{ borderColor: 'var(--jade)', background: 'var(--jade-glow)' }}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--jade)' }} />
                  <h3 className="text-lg font-fraunces font-semibold" style={{ color: 'var(--neutral-50)' }}>
                    Payment Account Connected
                  </h3>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--neutral-300)' }}>
                  Your Stripe account is connected. Payments go directly to your account.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    {organizer?.stripeChargesEnabled ? (
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                    )}
                    <span className="text-sm" style={{ color: 'var(--neutral-200)' }}>
                      {organizer?.stripeChargesEnabled ? 'Can accept payments' : 'Setup incomplete'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {organizer?.stripePayoutsEnabled ? (
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                    )}
                    <span className="text-sm" style={{ color: 'var(--neutral-200)' }}>
                      {organizer?.stripePayoutsEnabled ? 'Payouts enabled' : 'Pending setup'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--neutral-200)' }}>
                      Platform Fee: {(organizer?.platformFeeBps || 500) / 100}%
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/tickets/organizer/settings">
                <Button 
                  variant="outline" 
                  className="glass-card hover-glow touch-target whitespace-nowrap"
                  style={{ color: 'var(--neutral-50)' }}
                  data-testid="button-account-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Premium KPI Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-elevated rounded-xl p-5 hover-lift animate-slideUp" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--neutral-400)' }}>
                Active Events
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--copper)' }} />
              </div>
            </div>
            <div className="text-3xl font-fraunces font-bold mb-1" style={{ color: 'var(--neutral-50)' }}>
              {stats.activeEvents}
            </div>
            <p className="text-xs" style={{ color: 'var(--neutral-500)' }}>
              Published & live
            </p>
          </div>
          
          <div className="glass-elevated rounded-xl p-5 hover-lift animate-slideUp" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--neutral-400)' }}>
                Draft Events
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--neutral-800)' }}>
                <Edit className="w-4 h-4" style={{ color: 'var(--neutral-400)' }} />
              </div>
            </div>
            <div className="text-3xl font-fraunces font-bold mb-1" style={{ color: 'var(--neutral-50)' }}>
              {draftEvents.length}
            </div>
            <p className="text-xs" style={{ color: 'var(--neutral-500)' }}>
              Work in progress
            </p>
          </div>
          
          <div className="glass-elevated rounded-xl p-5 hover-lift animate-slideUp" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--neutral-400)' }}>
                Total Events
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--jade-glow)' }}>
                <Ticket className="w-4 h-4" style={{ color: 'var(--jade)' }} />
              </div>
            </div>
            <div className="text-3xl font-fraunces font-bold mb-1" style={{ color: 'var(--neutral-50)' }}>
              {events.length}
            </div>
            <p className="text-xs" style={{ color: 'var(--neutral-500)' }}>
              All time
            </p>
          </div>
          
          <div className="glass-elevated rounded-xl p-5 hover-lift animate-slideUp" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--neutral-400)' }}>
                Revenue
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)' }}>
                <DollarSign className="w-4 h-4" style={{ color: 'var(--copper)' }} />
              </div>
            </div>
            <div className="text-2xl font-fraunces font-bold mb-1" style={{ color: 'var(--neutral-50)' }}>
              Stripe
            </div>
            <p className="text-xs" style={{ color: 'var(--neutral-500)' }}>
              View in dashboard
            </p>
          </div>
        </div>

        {/* Events Management */}
        <div className="glass-elevated rounded-xl p-6 animate-slideUp" style={{ animationDelay: '500ms' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-fraunces font-bold mb-1" style={{ color: 'var(--neutral-50)' }}>
                Your Events
              </h2>
              <p className="text-sm" style={{ color: 'var(--neutral-400)' }}>
                Manage your ticketed events
              </p>
            </div>
            <Link href="/tickets/organizer/events/new">
              <Button 
                className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target whitespace-nowrap"
                data-testid="button-create-event"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
          <div>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      You haven't created any events yet
                    </p>
                    <Link href="/tickets/organizer/events/new">
                      <Button variant="outline" data-testid="button-first-event">
                        Create Your First Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  events.map(event => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`card-event-${event.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{event.title}</h3>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.startAt), 'PPP')} • {event.venue}, {event.city}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={`/tickets/organizer/events/${event.id}/edit`}>
                          <Button variant="outline" size="sm" data-testid={`button-edit-${event.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        
                        {event.status === 'published' && (
                          <Link href={`/tickets/event/${event.slug}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-${event.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-more-${event.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                              <DropdownMenuItem>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analytics
                              </DropdownMenuItem>
                            </Link>
                            
                            <Link href={`/tickets/organizer/events/${event.id}`}>
                              <DropdownMenuItem>
                                <Users className="w-4 h-4 mr-2" />
                                View Attendees
                              </DropdownMenuItem>
                            </Link>
                            
                            <Link href={`/tickets/organizer/events/${event.id}/discount`}>
                              <DropdownMenuItem>
                                <Tag className="w-4 h-4 mr-2" />
                                Discount Codes
                              </DropdownMenuItem>
                            </Link>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => duplicateEventMutation.mutate(event.id)}
                              disabled={duplicateEventMutation.isPending}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate Event
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => archiveEventMutation.mutate({ 
                                eventId: event.id, 
                                archive: event.status !== 'archived' 
                              })}
                              disabled={archiveEventMutation.isPending}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              {event.status === 'archived' ? 'Unarchive' : 'Archive'} Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="published" className="space-y-4">
                {events.filter(e => e.status === 'published').map(event => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startAt), 'PPP')} • {event.venue}, {event.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/tickets/organizer/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="draft" className="space-y-4">
                {events.filter(e => e.status === 'draft').map(event => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startAt), 'PPP')} • {event.venue}, {event.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/tickets/organizer/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Check-in App</CardTitle>
              <CardDescription>Scan tickets at your events</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tickets/checkin">
                <Button variant="outline" className="w-full" data-testid="button-checkin">
                  <Users className="w-4 h-4 mr-2" />
                  Open Check-in App
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payouts</CardTitle>
              <CardDescription>View your payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tickets/organizer/payouts">
                <Button variant="outline" className="w-full" data-testid="button-payouts">
                  <DollarSign className="w-4 h-4 mr-2" />
                  View Payouts
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tickets/organizer/settings">
                <Button variant="outline" className="w-full" data-testid="button-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}