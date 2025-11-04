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
      <div className="min-h-screen bg-charcoal-gradient">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-16">
          <div className="text-center mb-12 md:mb-20">
            <Skeleton className="h-10 w-48 mx-auto mb-6 rounded-full" style={{ background: 'var(--charcoal-elevated)' }} />
            <Skeleton className="h-16 w-96 max-w-full mx-auto mb-4 rounded-2xl" style={{ background: 'var(--charcoal-elevated)' }} />
            <Skeleton className="h-6 w-80 max-w-full mx-auto rounded-full" style={{ background: 'var(--charcoal-elevated)' }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-elevated rounded-xl overflow-hidden">
                <Skeleton className="h-52 w-full" style={{ background: 'var(--charcoal-surface)' }} />
                <div className="p-5 space-y-4">
                  <Skeleton className="h-6 w-3/4" style={{ background: 'var(--charcoal-surface)' }} />
                  <Skeleton className="h-4 w-1/2" style={{ background: 'var(--charcoal-surface)' }} />
                  <div className="space-y-2.5">
                    <Skeleton className="h-8 w-full" style={{ background: 'var(--charcoal-surface)' }} />
                    <Skeleton className="h-8 w-full" style={{ background: 'var(--charcoal-surface)' }} />
                    <Skeleton className="h-8 w-4/5" style={{ background: 'var(--charcoal-surface)' }} />
                  </div>
                  <Skeleton className="h-12 w-full rounded-lg" style={{ background: 'var(--copper-glow)' }} />
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
    <div className="min-h-screen bg-charcoal-gradient">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        {/* Premium Hero Section with Glassmorphism */}
        <div className="text-center mb-12 md:mb-20 animate-fadeIn">
          <div className="inline-flex items-center gap-3 glass-card rounded-full px-6 py-2.5 mb-6 hover-glow">
            <div className="w-2 h-2 bg-copper-gradient rounded-full animate-glow" />
            <span className="text-sm font-medium" style={{ color: 'var(--copper-light)' }}>Live Events</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-fraunces font-bold mb-6 leading-[1.1]" style={{ color: 'var(--neutral-50)' }}>
            Discover <br className="md:hidden" />
            <span className="text-copper-gradient">Premium</span>
            <br className="hidden md:block" /> Events
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--neutral-200)' }}>
            Experience the finest cultural moments across Canada
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
                className="group animate-slideUp hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`card-event-${event.id}`}
              >
                <div className="glass-elevated rounded-xl overflow-hidden h-full flex flex-col">
                  {/* Premium Event Cover */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {event.coverUrl ? (
                      <>
                        <img 
                          src={event.coverUrl} 
                          alt={event.title}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                          data-testid={`img-event-${event.id}`}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Top Badges Row */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          {soldOut ? (
                            <div className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: 'var(--error)', color: 'white' }}>
                              SOLD OUT
                            </div>
                          ) : lowestPrice > 0 ? (
                            <div className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold bg-copper-gradient text-white shadow-lg">
                              From ${(lowestPrice / 100).toFixed(0)}
                            </div>
                          ) : <div />}
                          
                          <div className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md" style={{ color: 'var(--neutral-50)' }}>
                            {format(eventDate, 'MMM d')}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-charcoal-elevated flex items-center justify-center">
                        <Calendar className="w-12 h-12" style={{ color: 'var(--neutral-600)' }} />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                      <h3 className="text-lg md:text-xl font-fraunces font-semibold mb-2 line-clamp-2 transition-colors group-hover:text-copper-light" style={{ color: 'var(--neutral-50)' }}>
                        {event.title}
                      </h3>
                      {event.summary && (
                        <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--neutral-400)' }}>
                          {event.summary}
                        </p>
                      )}
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--neutral-200)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)' }}>
                          <Calendar className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                        </div>
                        <span className="font-medium">{format(eventDate, 'EEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--neutral-200)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)' }}>
                          <Clock className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                        </div>
                        <span>{format(eventDate, 'h:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--neutral-200)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)' }}>
                          <MapPin className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                        </div>
                        <span className="line-clamp-1">{event.venue}, {event.city}</span>
                      </div>
                    </div>
                    
                    {/* CTA Button */}
                    <Link href={`/tickets/event/${event.slug}`}>
                      <Button 
                        className={`w-full touch-target bg-copper-gradient hover:shadow-glow-copper transition-all text-white font-semibold ${soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ borderRadius: 'var(--radius-lg)' }}
                        disabled={soldOut}
                        data-testid={`button-view-${event.id}`}
                      >
                        {soldOut ? "Sold Out" : "View Event"}
                        {!soldOut && (
                          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}