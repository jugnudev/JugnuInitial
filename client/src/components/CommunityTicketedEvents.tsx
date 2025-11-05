import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Calendar, MapPin, Clock, User2, ExternalLink, Sparkles } from 'lucide-react';
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

  const events = data?.events || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-fraunces text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
            Upcoming Events
          </h2>
          <p className="text-base md:text-lg text-premium-text-secondary max-w-2xl mx-auto">
            Where strangers sync and the room finds one frequency
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border border-copper-500/20 rounded-2xl h-80"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20">
        <CardContent className="py-12 md:py-16 text-center">
          <Ticket className="h-12 w-12 md:h-16 md:w-16 text-red-500/50 mx-auto mb-4" />
          <h3 className="font-fraunces text-xl md:text-2xl font-semibold text-white mb-2">
            Failed to Load Events
          </h3>
          <p className="text-premium-text-secondary">
            Unable to fetch ticketed events. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-fraunces text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
            Upcoming Events
          </h2>
          <p className="text-base md:text-lg text-premium-text-secondary max-w-2xl mx-auto">
            Where strangers sync and the room finds one frequency
          </p>
        </div>
        <Card className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20">
          <CardContent className="py-12 md:py-16 text-center">
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-radial from-copper-500/20 via-transparent to-transparent rounded-2xl"></div>
              <div className="relative">
                <Sparkles className="h-12 w-12 md:h-16 md:w-16 text-copper-500/50 mx-auto mb-4 md:mb-6" />
                <h3 className="font-fraunces text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">
                  New dates are lighting up soon.
                </h3>
                <p className="text-premium-text-secondary mb-4 md:mb-6">
                  Check back soon for upcoming events from this community.
                </p>
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

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="font-fraunces text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
          Upcoming Events
        </h2>
        <p className="text-base md:text-lg text-premium-text-secondary max-w-2xl mx-auto">
          Where strangers sync and the room finds one frequency
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {events.map((event) => {
          const minPrice = getMinPrice(event);
          const available = hasAvailableTickets(event);
          
          return (
            <Card 
              key={event.id}
              className="group bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20 hover:border-copper-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-copper-500/20 overflow-hidden"
              data-testid={`card-event-${event.slug}`}
            >
              {/* Event Cover Image */}
              {event.coverUrl && (
                <div className="relative h-48 md:h-56 overflow-hidden">
                  <img 
                    src={event.coverUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {!available && (
                    <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white">
                      SOLD OUT
                    </div>
                  )}
                </div>
              )}
              
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Event Title */}
                <h3 className="font-fraunces text-xl md:text-2xl font-bold text-white line-clamp-2 group-hover:text-copper-400 transition-colors">
                  {event.title}
                </h3>

                {/* Event Summary */}
                {event.summary && (
                  <p className="text-sm md:text-base text-premium-text-secondary line-clamp-2">
                    {event.summary}
                  </p>
                )}

                {/* Event Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-premium-text-secondary">
                    <Calendar className="h-4 w-4 text-copper-500 flex-shrink-0" />
                    <span className="truncate">
                      {format(new Date(event.startAt), 'EEE, MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-premium-text-secondary">
                    <Clock className="h-4 w-4 text-copper-500 flex-shrink-0" />
                    <span className="truncate">
                      {format(new Date(event.startAt), 'h:mm a')}
                      {event.endAt && ` - ${format(new Date(event.endAt), 'h:mm a')}`}
                    </span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2 text-sm text-premium-text-secondary">
                      <MapPin className="h-4 w-4 text-copper-500 flex-shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-premium-text-secondary">
                    <User2 className="h-4 w-4 text-copper-500 flex-shrink-0" />
                    <span className="truncate">{event.city}, {event.province}</span>
                  </div>
                </div>

                {/* Pricing */}
                {minPrice !== null && (
                  <div className="pt-2 border-t border-copper-500/20">
                    <p className="text-sm text-premium-text-muted">Starting at</p>
                    <p className="text-2xl md:text-3xl font-bold text-white">
                      ${(minPrice / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* CTA Button */}
                <Link href={`/tickets/events/${event.slug}`}>
                  <Button 
                    className={`w-full ${
                      available 
                        ? 'bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700' 
                        : 'bg-gray-500 cursor-not-allowed'
                    } text-white font-semibold`}
                    disabled={!available}
                    data-testid={`button-view-event-${event.slug}`}
                  >
                    {available ? (
                      <>
                        <Ticket className="h-4 w-4 mr-2" />
                        View Event
                      </>
                    ) : (
                      'Sold Out'
                    )}
                    {available && <ExternalLink className="h-4 w-4 ml-2" />}
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
