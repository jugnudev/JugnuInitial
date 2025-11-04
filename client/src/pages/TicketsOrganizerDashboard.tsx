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
  Copy
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

interface Event {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  startAt: Date;
  venue: string;
  city: string;
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
  status: 'active' | 'suspended';
}

interface RevenueSummary {
  totalEarned: number;
  totalPaidOut: number;
  pendingBalance: number;
  lastPayoutDate?: string;
}

export function TicketsOrganizerDashboard() {
  const { toast } = useToast();
  
  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  // For MVP, get organizer ID from localStorage
  const organizerId = localStorage.getItem('ticketsOrganizerId');
  
  const { data, isLoading, error } = useQuery<{ ok: boolean; organizer: Organizer; events: Event[] }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled && !!organizerId,
    meta: {
      headers: {
        'x-organizer-id': organizerId || ''
      }
    }
  });

  // Stripe Connect: No revenue summary needed - payments go directly to organizer's Stripe account

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
        description: "Your event has been duplicated successfully."
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

  if (!organizerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Get Started</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Create your organizer account to start selling tickets
        </p>
        <Link href="/tickets/organizer/signup">
          <Button size="lg" data-testid="button-signup">
            Create Organizer Account
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Unable to load dashboard</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const organizer: Organizer | undefined = data?.organizer;
  const events: Event[] = data?.events || [];

  // Calculate stats
  const activeEvents = events.filter(e => e.status === 'published').length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-fraunces mb-2">Organizer Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {organizer?.businessName}
          </p>
        </div>

        {/* Stripe Connect Status */}
        {!organizer?.stripeOnboardingComplete ? (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">Complete Stripe Setup</CardTitle>
              <CardDescription className="text-orange-700">
                Connect your Stripe account to start accepting payments for your events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-800">
                    You need to complete Stripe Connect onboarding before you can sell tickets.
                  </p>
                </div>
                <Link href="/tickets/organizer/connect">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="button-connect-stripe">
                    <Settings className="w-4 h-4 mr-2" />
                    Connect Stripe
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Payment Account Connected</CardTitle>
              <CardDescription className="text-green-700">
                Your Stripe account is connected. Payments go directly to your Stripe account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-green-800">
                    <strong>Status:</strong> {organizer?.stripeChargesEnabled ? '✓ Can accept payments' : '⚠ Setup incomplete'}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Payouts:</strong> {organizer?.stripePayoutsEnabled ? '✓ Enabled' : '⚠ Pending setup'}
                  </p>
                  <p className="text-sm text-green-600">
                    <strong>Platform Fee:</strong> {(organizer?.platformFeeBps || 500) / 100}%
                  </p>
                </div>
                <Link href="/tickets/organizer/settings">
                  <Button variant="outline" data-testid="button-account-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEvents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Events</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftEvents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Ticket className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue & Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Stripe Dashboard</div>
              <p className="text-xs text-muted-foreground">
                View in your Stripe account
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Events</CardTitle>
              <CardDescription>Manage your ticketed events</CardDescription>
            </div>
            <Link href="/tickets/organizer/events/new">
              <Button data-testid="button-create-event">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
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
                        <Link href={`/tickets/organizer/events/${event.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-manage-${event.id}`}>
                            <Settings className="w-4 h-4 mr-2" />
                            Manage
                          </Button>
                        </Link>
                        
                        <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                          <Button variant="outline" size="sm" data-testid={`button-analytics-${event.id}`}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
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
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateEventMutation.mutate(event.id)}
                          disabled={duplicateEventMutation.isPending}
                          data-testid={`button-duplicate-${event.id}`}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
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
          </CardContent>
        </Card>

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