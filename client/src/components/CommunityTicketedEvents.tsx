import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, MapPin, Clock, User2, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
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

interface CommunityTicketedEventsProps {
  organizerId: string;
}

export default function CommunityTicketedEvents({ organizerId }: CommunityTicketedEventsProps) {
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
    
    // If we're past start time and either no end time or before end time
    return 'ongoing';
  };
  
  // Filter out ended events from the public-facing Events tab
  const events = allEvents.filter(event => getEventStatus(event) !== 'ended');

  if (isLoading) {
    return (
      <div className="space-y-8 md:space-y-12">
        <div className="text-center animate-fadeIn">
          <div className="inline-block mb-4">
            <Badge variant="outline" className="border-copper-500/50 text-copper-400 bg-copper-500/10 px-4 py-1.5 text-sm font-semibold tracking-wide">
              CURATED SESSIONS
            </Badge>
          </div>
          <h2 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight">
            Live & Coming Up
          </h2>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            From the beat of the city to the rhythm of the room
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="glass-elevated rounded-3xl h-[420px] md:h-[480px] bg-gradient-to-br from-charcoal-800/50 via-charcoal-900/50 to-charcoal-950/50"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass-elevated border-red-500/30 bg-red-500/5">
        <CardContent className="py-16 md:py-24 text-center">
          <div className="max-w-md mx-auto">
            <Ticket className="h-16 w-16 md:h-20 md:w-20 text-red-400/70 mx-auto mb-6" />
            <h3 className="font-fraunces text-2xl md:text-3xl font-bold text-white mb-3">
              Unable to Load Events
            </h3>
            <p className="text-neutral-400 text-lg">
              We couldn't fetch the event listings. Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-8 md:space-y-12">
        <div className="text-center animate-fadeIn">
          <div className="inline-block mb-4">
            <Badge variant="outline" className="border-copper-500/50 text-copper-400 bg-copper-500/10 px-4 py-1.5 text-sm font-semibold tracking-wide">
              CURATED SESSIONS
            </Badge>
          </div>
          <h2 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight">
            Live & Coming Up
          </h2>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            From the beat of the city to the rhythm of the room
          </p>
        </div>

        <Card className="glass-elevated border-copper-500/30 overflow-hidden">
          <CardContent className="py-16 md:py-24 text-center">
            <div className="relative max-w-lg mx-auto">
              <div className="absolute inset-0 bg-gradient-radial from-copper-500/20 via-accent/10 to-transparent blur-3xl"></div>
              <div className="relative space-y-6">
                <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-copper-500/20 to-accent/20 backdrop-blur-xl border border-copper-500/30">
                  <Sparkles className="h-12 w-12 md:h-16 md:w-16 text-copper-400" />
                </div>
                <div>
                  <h3 className="font-fraunces text-2xl md:text-3xl font-bold text-white mb-4">
                    New dates are lighting up soon.
                  </h3>
                  <p className="text-lg text-neutral-400 leading-relaxed">
                    Check back soon for upcoming events from this community.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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

  // Calculate sold percentage for demand indicator
  const getSoldPercentage = (event: TicketedEvent) => {
    const totalCapacity = event.tiers.reduce((sum, tier) => sum + (tier.capacity || 0), 0);
    const totalSold = event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
    if (totalCapacity === 0) return 0;
    return Math.round((totalSold / totalCapacity) * 100);
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn">
      {/* Premium Header Section */}
      <div className="text-center">
        <div className="inline-block mb-4 animate-slideUp">
          <Badge variant="outline" className="border-copper-500/50 text-copper-400 bg-copper-500/10 px-4 py-1.5 text-sm font-semibold tracking-wide">
            CURATED SESSIONS
          </Badge>
        </div>
        <h2 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight animate-slideUp" style={{animationDelay: '0.1s'}}>
          Live & Coming Up
        </h2>
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed animate-slideUp" style={{animationDelay: '0.2s'}}>
          From the beat of the city to the rhythm of the room
        </p>
      </div>

      {/* Premium Event Grid - 2 Column Layout for Better Visual Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {events.map((event, index) => {
          const minPrice = getMinPrice(event);
          const available = hasAvailableTickets(event);
          const soldPercentage = getSoldPercentage(event);
          const isHighDemand = soldPercentage > 70;
          const eventStatus = getEventStatus(event);
          const isOngoing = eventStatus === 'ongoing';
          
          return (
            <Card 
              key={event.id}
              className={`group glass-elevated hover:glass-card transition-all duration-500 overflow-hidden hover:shadow-2xl hover:-translate-y-1 animate-slideUp ${
                isOngoing 
                  ? 'border-2 border-copper-500/60 shadow-2xl shadow-copper-500/30 hover:border-copper-500/80 hover:shadow-copper-500/40' 
                  : 'border-copper-500/20 hover:border-copper-500/40 hover:shadow-copper-500/20'
              }`}
              style={{animationDelay: `${index * 0.1}s`}}
              data-testid={`card-event-${event.slug}`}
            >
              {/* Cover Image with Enhanced Overlay */}
              <div className="relative h-56 md:h-64 lg:h-72 overflow-hidden bg-gradient-to-br from-charcoal-800 to-charcoal-950">
                {event.coverUrl ? (
                  <>
                    <img 
                      src={event.coverUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-copper-900/30 via-charcoal-900 to-charcoal-950">
                    <Ticket className="h-20 w-20 text-copper-500/30" />
                  </div>
                )}
                
                {/* Status Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {isOngoing && (
                    <Badge className="bg-gradient-to-r from-copper-500 to-copper-600 backdrop-blur-xl border-0 text-white font-bold px-3 py-1 shadow-lg shadow-copper-500/50 animate-pulse">
                      ● LIVE NOW
                    </Badge>
                  )}
                  {!available ? (
                    <Badge className="bg-red-500/90 hover:bg-red-500 backdrop-blur-xl border-0 text-white font-bold px-3 py-1 shadow-lg">
                      SOLD OUT
                    </Badge>
                  ) : isHighDemand ? (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 backdrop-blur-xl border-0 text-white font-bold px-3 py-1 shadow-lg flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      HIGH DEMAND
                    </Badge>
                  ) : null}
                </div>
              </div>
              
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Event Title */}
                <div className="space-y-3">
                  <h3 className="font-fraunces text-2xl md:text-3xl font-bold text-white leading-tight group-hover:text-copper-400 transition-colors duration-300">
                    {event.title}
                  </h3>
                  
                  {event.summary && (
                    <p className="text-base md:text-lg text-neutral-400 line-clamp-2 leading-relaxed">
                      {event.summary}
                    </p>
                  )}
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-charcoal-800/50 hover:bg-charcoal-800/70 transition-colors">
                    <div className="p-2 rounded-lg bg-copper-500/10">
                      <Calendar className="h-4 w-4 text-copper-400 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-500 font-medium mb-0.5">DATE</p>
                      <p className="text-sm text-white font-semibold truncate">
                        {format(new Date(event.startAt), 'EEE, MMM d')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-charcoal-800/50 hover:bg-charcoal-800/70 transition-colors">
                    <div className="p-2 rounded-lg bg-copper-500/10">
                      <Clock className="h-4 w-4 text-copper-400 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-500 font-medium mb-0.5">TIME</p>
                      <p className="text-sm text-white font-semibold truncate">
                        {format(new Date(event.startAt), 'h:mm a')}
                      </p>
                    </div>
                  </div>

                  {event.venue && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-charcoal-800/50 hover:bg-charcoal-800/70 transition-colors sm:col-span-2">
                      <div className="p-2 rounded-lg bg-copper-500/10">
                        <MapPin className="h-4 w-4 text-copper-400 flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-500 font-medium mb-0.5">VENUE</p>
                        <p className="text-sm text-white font-semibold truncate">
                          {event.venue}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-charcoal-800/50 hover:bg-charcoal-800/70 transition-colors sm:col-span-2">
                    <div className="p-2 rounded-lg bg-copper-500/10">
                      <User2 className="h-4 w-4 text-copper-400 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-500 font-medium mb-0.5">LOCATION</p>
                      <p className="text-sm text-white font-semibold truncate">
                        {event.city}, {event.province}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing Section - Premium Pill Design */}
                {minPrice !== null && (
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-copper-500/20">
                    <div className="inline-flex items-baseline gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-copper-500/10 to-accent/10 border border-copper-500/30 backdrop-blur-sm">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">From</span>
                      <span className="font-fraunces text-lg font-bold text-white">
                        ${(minPrice / 100).toFixed(minPrice % 100 === 0 ? 0 : 2)}
                      </span>
                    </div>
                    {isHighDemand && available && (
                      <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10 text-xs font-semibold">
                        {soldPercentage}% Sold
                      </Badge>
                    )}
                  </div>
                )}

                {/* Premium CTA Button */}
                <Link href={`/tickets/event/${event.slug}`}>
                  <Button 
                    className={`w-full h-12 md:h-14 text-base md:text-lg font-bold transition-all duration-300 ${
                      available 
                        ? 'bg-copper-gradient hover:shadow-glow-copper text-white touch-target' 
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                    disabled={!available}
                    data-testid={`button-view-event-${event.slug}`}
                  >
                    {available ? (
                      <>
                        <Ticket className="h-5 w-5 mr-2" />
                        View Event
                        <ExternalLink className="h-5 w-5 ml-2" />
                      </>
                    ) : (
                      <>
                        <span>Sold Out</span>
                      </>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
