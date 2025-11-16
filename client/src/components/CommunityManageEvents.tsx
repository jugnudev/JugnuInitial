import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, MapPin, Clock, Users, ExternalLink, QrCode, BarChart3, Edit3 } from 'lucide-react';
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
  
  const events = allEvents;

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse glass-elevated rounded-2xl h-[32rem] md:h-80"></div>
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
            <Button className="h-14 bg-gradient-to-r from-[hsl(27,78%,54%)] to-[hsl(18,84%,44%)] hover:from-[hsl(27,78%,58%)] hover:to-[hsl(18,84%,48%)] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#c0580f]/40 border-2 border-[#c0580f]/60 hover:border-[#d3541e]/80 transition-all duration-300 hover:scale-105 active:scale-95">
              <Ticket className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getMinPrice = (event: TicketedEvent) => {
    if (event.tiers.length === 0) return null;
    const prices = event.tiers.map(t => t.priceCents);
    return Math.min(...prices);
  };

  const getSoldPercentage = (event: TicketedEvent) => {
    const totalCapacity = event.tiers.reduce((sum, tier) => sum + (tier.capacity || 0), 0);
    const totalSold = event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
    if (totalCapacity === 0) return 0;
    return Math.round((totalSold / totalCapacity) * 100);
  };

  const getTotalAttendees = (event: TicketedEvent) => {
    return event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {events.map((event) => {
        const minPrice = getMinPrice(event);
        const soldPercentage = getSoldPercentage(event);
        const totalAttendees = getTotalAttendees(event);
        const eventStatus = getEventStatus(event);
        const isOngoing = eventStatus === 'ongoing';
        const isEnded = eventStatus === 'ended';
        
        return (
          <Card 
            key={event.id}
            className={`glass-elevated overflow-hidden border ${
              isOngoing 
                ? 'border-copper-500/60 shadow-xl shadow-copper-500/20' 
                : isEnded
                ? 'border-neutral-600/40'
                : 'border-copper-500/30'
            } transition-all duration-300 hover:shadow-2xl hover:shadow-copper-500/20 hover:border-copper-500/50`}
            data-testid={`manage-event-card-${event.slug}`}
          >
            {/* Mobile Layout: Vertical Stack */}
            <div className="md:hidden">
              {/* Cover Photo - Full Width on Mobile with Minimal Overlay */}
              <div className="relative w-full h-64 overflow-hidden">
                {event.coverUrl ? (
                  <img 
                    src={event.coverUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#c0580f]/40 via-[#d3541e]/30 to-black/70 flex items-center justify-center">
                    <Ticket className="h-20 w-20 text-copper-400/60" />
                  </div>
                )}
                {/* Subtle Gradient Overlay - Only at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3">
                  {isOngoing && (
                    <Badge className="bg-gradient-to-r from-copper-500 to-copper-600 text-white shadow-lg shadow-copper-500/50 animate-pulse backdrop-blur-sm border border-copper-400/30">
                      ● LIVE
                    </Badge>
                  )}
                  {isEnded && (
                    <Badge className="bg-black/70 backdrop-blur-md border border-neutral-500/50 text-neutral-300 shadow-lg">
                      ENDED
                    </Badge>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="font-fraunces text-2xl font-bold text-white mb-2 line-clamp-2 leading-tight">
                    {event.title}
                  </h3>
                  {event.summary && (
                    <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">{event.summary}</p>
                  )}
                </div>

                {/* Event Meta - Generous Spacing */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30">
                      <Calendar className="h-4 w-4 text-copper-300" />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(event.startAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30">
                      <Clock className="h-4 w-4 text-copper-300" />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(event.startAt), 'h:mm a')}
                    </span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30">
                        <MapPin className="h-4 w-4 text-copper-300" />
                      </div>
                      <span className="text-sm text-white font-medium truncate">
                        {event.venue}, {event.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats - Stacked Vertically on Mobile for Better Touch Targets */}
                <div className="space-y-3 py-4 px-4 rounded-2xl bg-gradient-to-br from-copper-500/10 via-transparent to-copper-600/5 border border-copper-500/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10">
                    <span className="text-xs text-copper-300 uppercase tracking-wider font-semibold">Attendees</span>
                    <span className="text-2xl font-bold text-white">{totalAttendees}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10">
                    <span className="text-xs text-copper-300 uppercase tracking-wider font-semibold">Tickets Sold</span>
                    <span className="text-2xl font-bold text-white">{soldPercentage}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10">
                    <span className="text-xs text-copper-300 uppercase tracking-wider font-semibold">Starting At</span>
                    <span className="text-2xl font-bold text-white">
                      {minPrice ? `$${(minPrice / 100).toFixed(0)}` : '-'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons - Full Width Premium Touch Targets */}
                <div className="space-y-3 pt-2">
                  <Link href={`/tickets/organizer/events/${event.id}/attendees`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-[hsl(27,78%,54%)] to-[hsl(18,84%,44%)] hover:from-[hsl(27,78%,58%)] hover:to-[hsl(18,84%,48%)] text-white font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-[#c0580f]/40 border-2 border-[#c0580f]/60 hover:border-[#d3541e]/80 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      data-testid={`button-attendees-${event.slug}`}
                    >
                      <Users className="h-5 w-5 mr-2.5" />
                      Manage Attendees
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/checkin`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-[hsl(168,68%,42%)] to-[hsl(168,74%,35%)] hover:from-[hsl(168,68%,46%)] hover:to-[hsl(168,74%,39%)] text-white font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-[#17C0A9]/40 border-2 border-[#17C0A9]/60 hover:border-[#17C0A9]/80 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      data-testid={`button-checkin-${event.slug}`}
                    >
                      <QrCode className="h-5 w-5 mr-2.5" />
                      Check-in Dashboard
                    </Button>
                  </Link>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                      <Button 
                        className="w-full h-14 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/30 border border-blue-500/40 hover:border-blue-400/60 transition-all duration-300 backdrop-blur-sm"
                        data-testid={`button-analytics-${event.slug}`}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </Link>

                    <Link href={`/tickets/organizer/events/${event.id}/edit`}>
                      <Button 
                        className="w-full h-14 bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-purple-500/30 border border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 backdrop-blur-sm"
                        data-testid={`button-edit-${event.slug}`}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>

                  <Link href={`/tickets/event/${event.slug}`}>
                    <Button 
                      variant="outline"
                      className="w-full h-14 border-2 border-copper-500/40 text-copper-300 hover:text-white hover:bg-copper-500/20 hover:border-copper-400/60 transition-all duration-300 font-semibold backdrop-blur-sm"
                      data-testid={`button-view-public-${event.slug}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Public Page
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop Layout: Horizontal Split with Prominent Cover */}
            <div className="hidden md:grid md:grid-cols-5 gap-0 min-h-[360px]">
              {/* Cover Photo - Left Side on Desktop */}
              <div className="relative col-span-2 h-full overflow-hidden group">
                {event.coverUrl ? (
                  <>
                    <img 
                      src={event.coverUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Subtle Vignette Only */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#c0580f]/40 via-[#d3541e]/30 to-black/70 flex items-center justify-center">
                    <Ticket className="h-28 w-28 text-copper-400/60" />
                  </div>
                )}
                {/* Status Badge Overlay */}
                <div className="absolute top-5 right-5">
                  {isOngoing && (
                    <Badge className="bg-gradient-to-r from-copper-500 to-copper-600 text-white shadow-2xl shadow-copper-500/60 animate-pulse backdrop-blur-md border-2 border-copper-400/40 text-base px-4 py-1.5">
                      ● LIVE NOW
                    </Badge>
                  )}
                  {isEnded && (
                    <Badge className="bg-black/70 backdrop-blur-md border-2 border-neutral-500/60 text-neutral-300 shadow-xl text-base px-4 py-1.5">
                      ENDED
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content - Middle */}
              <div className="col-span-2 p-7 space-y-6 flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <h3 className="font-fraunces text-3xl font-bold text-white mb-3 line-clamp-2 leading-tight">
                      {event.title}
                    </h3>
                    {event.summary && (
                      <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">{event.summary}</p>
                    )}
                  </div>

                  {/* Event Meta with Premium Icons */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30 shadow-lg shadow-copper-500/20">
                        <Calendar className="h-4.5 w-4.5 text-copper-300" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {format(new Date(event.startAt), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30 shadow-lg shadow-copper-500/20">
                        <Clock className="h-4.5 w-4.5 text-copper-300" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {format(new Date(event.startAt), 'h:mm a')}
                      </span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-copper-500/30 to-copper-600/20 border border-copper-500/30 shadow-lg shadow-copper-500/20">
                          <MapPin className="h-4.5 w-4.5 text-copper-300" />
                        </div>
                        <span className="text-sm text-white font-medium truncate">
                          {event.venue}, {event.city}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats - Horizontal on Desktop with Copper Accents */}
                <div className="grid grid-cols-3 gap-4 py-5 px-5 rounded-2xl bg-gradient-to-br from-copper-500/15 via-transparent to-copper-600/10 border-2 border-copper-500/30 backdrop-blur-sm shadow-lg shadow-copper-500/10">
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-white to-copper-200 bg-clip-text text-transparent">{totalAttendees}</div>
                    <div className="text-xs text-copper-300 uppercase tracking-wide font-semibold mt-1.5">Attendees</div>
                  </div>
                  <div className="text-center border-x-2 border-copper-500/20">
                    <div className="text-3xl font-bold bg-gradient-to-r from-white to-copper-200 bg-clip-text text-transparent">{soldPercentage}%</div>
                    <div className="text-xs text-copper-300 uppercase tracking-wide font-semibold mt-1.5">Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-white to-copper-200 bg-clip-text text-transparent">
                      {minPrice ? `$${(minPrice / 100).toFixed(0)}` : '-'}
                    </div>
                    <div className="text-xs text-copper-300 uppercase tracking-wide font-semibold mt-1.5">Starting</div>
                  </div>
                </div>
              </div>

              {/* Actions - Right Side with Premium Styling */}
              <div className="col-span-1 border-l-2 border-copper-500/20 p-6 bg-gradient-to-br from-copper-500/5 via-transparent to-transparent flex flex-col backdrop-blur-sm">
                <div className="space-y-3 flex-1">
                  <Link href={`/tickets/organizer/events/${event.id}/attendees`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-[hsl(27,78%,54%)] to-[hsl(18,84%,44%)] hover:from-[hsl(27,78%,58%)] hover:to-[hsl(18,84%,48%)] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#c0580f]/40 border-2 border-[#c0580f]/60 hover:border-[#d3541e]/80 transition-all duration-300 hover:scale-105 active:scale-95"
                      data-testid={`button-attendees-${event.slug}`}
                    >
                      <Users className="h-4.5 w-4.5 mr-2" />
                      Manage Attendees
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/checkin`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-[hsl(168,68%,42%)] to-[hsl(168,74%,35%)] hover:from-[hsl(168,68%,46%)] hover:to-[hsl(168,74%,39%)] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#17C0A9]/40 border-2 border-[#17C0A9]/60 hover:border-[#17C0A9]/80 transition-all duration-300 hover:scale-105 active:scale-95"
                      data-testid={`button-checkin-${event.slug}`}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Check-in
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/30 border border-blue-500/40 hover:border-blue-400/60 transition-all duration-300 backdrop-blur-sm hover:scale-105 active:scale-95"
                      data-testid={`button-analytics-${event.slug}`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/edit`}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-purple-500/30 border border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 backdrop-blur-sm hover:scale-105 active:scale-95"
                      data-testid={`button-edit-${event.slug}`}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Event
                    </Button>
                  </Link>

                  <Link href={`/tickets/event/${event.slug}`}>
                    <Button 
                      variant="outline"
                      className="w-full h-14 border-2 border-copper-500/40 text-copper-300 hover:text-white hover:bg-copper-500/20 hover:border-copper-400/60 transition-all duration-300 font-semibold backdrop-blur-sm hover:scale-105 active:scale-95"
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
