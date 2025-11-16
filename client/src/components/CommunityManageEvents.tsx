import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, MapPin, Clock, User2, ExternalLink, Sparkles, TrendingUp, Users, QrCode, BarChart3, Edit3, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';

interface TicketTier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number | null;
  soldCount?: number;
}

interface TicketedEvent {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  venue: string | null;
  city: string;
  province: string;
  startAt: string;
  endAt: string | null;
  coverUrl: string | null;
  tiers: TicketTier[];
}

interface CommunityManageEventsProps {
  organizerId: string;
}

export default function CommunityManageEvents({ organizerId }: CommunityManageEventsProps) {
  const { data, isLoading, error } = useQuery<{
    ok: boolean;
    events: TicketedEvent[];
  }>({
    queryKey: ['/api/tickets/organizers', organizerId, 'published-events'],
  });

  const allEvents = data?.events || [];
  
  // Helper to determine event status
  const getEventStatus = (event: TicketedEvent): 'upcoming' | 'ongoing' | 'ended' => {
    const now = new Date();
    const startTime = new Date(event.startAt);
    const endTime = event.endAt ? new Date(event.endAt) : null;
    
    if (now < startTime) {
      return 'upcoming';
    }
    
    if (endTime && now > endTime) {
      return 'ended';
    }
    
    return 'ongoing';
  };
  
  // Show all events (including ended) in management view
  const events = allEvents;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse glass-elevated rounded-2xl h-64"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass-elevated border-red-500/30 bg-red-500/5">
        <CardContent className="py-12 text-center">
          <Ticket className="h-16 w-16 text-red-400/70 mx-auto mb-4" />
          <h3 className="font-fraunces text-2xl font-bold text-white mb-2">
            Unable to Load Events
          </h3>
          <p className="text-neutral-400">
            We couldn't fetch the event listings. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="glass-elevated border-copper-500/30">
        <CardContent className="py-16 text-center">
          <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-copper-500/20 to-accent/20 mb-4">
            <Ticket className="h-12 w-12 text-copper-400" />
          </div>
          <h3 className="font-fraunces text-2xl font-bold text-white mb-2">
            No Events Yet
          </h3>
          <p className="text-neutral-400 mb-6">
            Create your first ticketed event to start managing attendees.
          </p>
          <Link href="/tickets/organizer/events/new">
            <Button className="bg-copper-gradient hover:shadow-glow-copper text-white">
              <Ticket className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Get minimum price for an event
  const getMinPrice = (event: TicketedEvent) => {
    if (event.tiers.length === 0) return null;
    const prices = event.tiers.map(t => t.priceCents);
    return Math.min(...prices);
  };

  // Check if event has available tickets
  const hasAvailableTickets = (event: TicketedEvent) => {
    return event.tiers.some(tier => {
      if (tier.capacity === null) return true;
      return (tier.soldCount || 0) < tier.capacity;
    });
  };

  // Calculate sold percentage
  const getSoldPercentage = (event: TicketedEvent) => {
    const totalCapacity = event.tiers.reduce((sum, tier) => sum + (tier.capacity || 0), 0);
    const totalSold = event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
    if (totalCapacity === 0) return 0;
    return Math.round((totalSold / totalCapacity) * 100);
  };

  // Calculate total attendees
  const getTotalAttendees = (event: TicketedEvent) => {
    return event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
  };

  return (
    <div className="space-y-6">
      {events.map((event) => {
        const minPrice = getMinPrice(event);
        const available = hasAvailableTickets(event);
        const soldPercentage = getSoldPercentage(event);
        const totalAttendees = getTotalAttendees(event);
        const isHighDemand = soldPercentage > 70;
        const eventStatus = getEventStatus(event);
        const isOngoing = eventStatus === 'ongoing';
        const isEnded = eventStatus === 'ended';
        
        return (
          <Card 
            key={event.id}
            className={`glass-elevated overflow-hidden border ${
              isOngoing 
                ? 'border-copper-500/60 shadow-lg shadow-copper-500/20' 
                : isEnded
                ? 'border-neutral-600/40'
                : 'border-copper-500/20'
            }`}
            data-testid={`manage-event-card-${event.slug}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* Event Info Column */}
              <div className="md:col-span-2 p-6 space-y-4">
                {/* Header with Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-fraunces text-xl md:text-2xl font-bold text-white">
                        {event.title}
                      </h3>
                      {isOngoing && (
                        <Badge className="bg-gradient-to-r from-copper-500 to-copper-600 text-white animate-pulse">
                          ● LIVE
                        </Badge>
                      )}
                      {isEnded && (
                        <Badge variant="outline" className="border-neutral-500 text-neutral-400">
                          ENDED
                        </Badge>
                      )}
                    </div>
                    {event.summary && (
                      <p className="text-neutral-400 line-clamp-2">{event.summary}</p>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-copper-400" />
                    <span className="text-sm text-white">
                      {format(new Date(event.startAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-copper-400" />
                    <span className="text-sm text-white">
                      {format(new Date(event.startAt), 'h:mm a')}
                    </span>
                  </div>
                  {event.venue && (
                    <div className="col-span-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-copper-400" />
                      <span className="text-sm text-white truncate">
                        {event.venue}, {event.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{totalAttendees}</div>
                    <div className="text-xs text-neutral-400">Attendees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{soldPercentage}%</div>
                    <div className="text-xs text-neutral-400">Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {minPrice ? `$${(minPrice / 100).toFixed(0)}` : '-'}
                    </div>
                    <div className="text-xs text-neutral-400">Starting</div>
                  </div>
                </div>
              </div>

              {/* Actions Column */}
              <div className="border-t md:border-t-0 md:border-l border-white/10 p-6 bg-charcoal-800/30">
                <div className="space-y-2">
                  <Link href={`/tickets/organizer/events/${event.id}/attendees`}>
                    <Button 
                      className="w-full bg-copper-gradient hover:shadow-glow-copper text-white touch-target"
                      data-testid={`button-attendees-${event.slug}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Attendees
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/checkin`}>
                    <Button 
                      variant="outline"
                      className="w-full border-[#17C0A9]/30 text-white hover:bg-[#17C0A9]/10 touch-target"
                      data-testid={`button-checkin-${event.slug}`}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Check-in
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                    <Button 
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 touch-target"
                      data-testid={`button-analytics-${event.slug}`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/edit`}>
                    <Button 
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 touch-target"
                      data-testid={`button-edit-${event.slug}`}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Event
                    </Button>
                  </Link>

                  <Link href={`/tickets/event/${event.slug}`}>
                    <Button 
                      variant="ghost"
                      className="w-full text-neutral-400 hover:text-white hover:bg-white/5 touch-target"
                      data-testid={`button-view-public-${event.slug}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Public Page
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
