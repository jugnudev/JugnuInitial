import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, MapPin, Clock, Users, Tag, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Tier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number | null;
  soldCount: number;
  salesOpenAt: Date | null;
  salesCloseAt: Date | null;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverUrl: string | null;
  startAt: Date;
  endAt: Date | null;
  venue: string;
  city: string;
  tiers: Tier[];
}

export function TicketsEventListPage() {
  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  const { data, isLoading, error } = useQuery<{ ok: boolean; events: Event[] }>({
    queryKey: ['/api/tickets/events/public'],
    enabled: isEnabled
  });

  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Coming Soon</h1>
        <p className="text-lg text-muted-foreground">
          Ticketed events will be available soon.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-64 mx-auto mb-6 rounded-full" />
            <Skeleton className="h-16 w-96 mx-auto mb-6 rounded-2xl" />
            <Skeleton className="h-8 w-80 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="premium-surface-elevated rounded-2xl overflow-hidden">
                <Skeleton className="h-64 w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Unable to load events</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const events = data?.events || [];

  if (events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">No Events Available</h1>
        <p className="text-lg text-muted-foreground">
          Check back soon for upcoming events.
        </p>
      </div>
    );
  }

  // Helper to get lowest price for event
  const getLowestPrice = (event: Event) => {
    const prices = event.tiers.map(t => t.priceCents);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  // Helper to check if event is sold out
  const isSoldOut = (event: Event) => {
    return event.tiers.every(tier => 
      tier.capacity !== null && tier.soldCount >= tier.capacity
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 md:px-4 py-6 md:py-12 mobile-container">
        {/* Premium Hero Section */}
        <div className="text-center mb-8 md:mb-16 premium-fade-in mobile-hero-spacing">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-2 mb-6">
            <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-orange-300">Live Events</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-fraunces font-bold text-white mb-4 md:mb-6 leading-tight mobile-hero-title">
            Premium 
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              Events
            </span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mobile-hero-subtitle">
            Discover and purchase tickets for the finest cultural experiences across Canada
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
          {events.map((event: Event, index: number) => {
            const eventDate = new Date(event.startAt);
            const lowestPrice = getLowestPrice(event);
            const soldOut = isSoldOut(event);
            
            return (
              <div 
                key={event.id} 
                className="premium-event-card group premium-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
                data-testid={`card-event-${event.id}`}
              >
                {/* Premium Event Cover */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
                  {event.coverUrl ? (
                    <>
                      <img 
                        src={event.coverUrl} 
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        data-testid={`img-event-${event.id}`}
                      />
                      {/* Premium Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        {soldOut ? (
                          <div className="bg-red-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold border border-red-400/30">
                            SOLD OUT
                          </div>
                        ) : (
                          lowestPrice > 0 && (
                            <div className="premium-price-pill">
                              From ${(lowestPrice / 100).toFixed(0)}
                            </div>
                          )
                        )}
                      </div>
                      
                      {/* Event Date Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-semibold border border-white/30">
                          {format(eventDate, 'MMM d')}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>
                
                {/* Premium Content */}
                <div className="premium-surface-elevated rounded-b-2xl p-4 md:p-6 space-y-3 md:space-y-4 mobile-event-card">
                  {/* Title and Summary */}
                  <div>
                    <h3 className="text-xl font-fraunces font-bold text-white mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors">
                      {event.title}
                    </h3>
                    {event.summary && (
                      <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                        {event.summary}
                      </p>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                      <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-orange-400" />
                      </div>
                      <span>{format(eventDate, 'EEE, MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                      <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-orange-400" />
                      </div>
                      <span>{format(eventDate, 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                      <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-orange-400" />
                      </div>
                      <span className="line-clamp-1">{event.venue}, {event.city}</span>
                    </div>
                    {event.tiers.length > 0 && (
                      <div className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Users className="w-3 h-3 text-orange-400" />
                        </div>
                        <span>{event.tiers.length} ticket tier{event.tiers.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Premium CTA Button */}
                  <Link href={`/tickets/event/${event.slug}`}>
                    <Button 
                      className={`w-full premium-button ${soldOut ? 'opacity-60' : 'hover:scale-105'} transition-all duration-300`}
                      variant={soldOut ? "secondary" : "default"}
                      disabled={soldOut}
                      data-testid={`button-view-${event.id}`}
                    >
                      {soldOut ? "Sold Out" : "View Details & Buy"}
                      {!soldOut && (
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}