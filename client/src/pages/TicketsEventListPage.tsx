import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, MapPin, Clock, Users, Tag } from "lucide-react";
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
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-fraunces mb-4">Ticketed Events</h1>
          <p className="text-lg text-muted-foreground">
            Purchase tickets for upcoming cultural events in Metro Vancouver
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: Event) => {
            const eventDate = new Date(event.startAt);
            const lowestPrice = getLowestPrice(event);
            const soldOut = isSoldOut(event);
            
            return (
              <Card 
                key={event.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow"
                data-testid={`card-event-${event.id}`}
              >
                {event.imageUrl && (
                  <div className="aspect-video relative">
                    <img 
                      src={event.imageUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-event-${event.id}`}
                    />
                    {soldOut && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                          SOLD OUT
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-fraunces">
                      {event.title}
                    </CardTitle>
                    {!soldOut && lowestPrice > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        From ${(lowestPrice / 100).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {event.subtitle && (
                    <CardDescription className="text-sm">
                      {event.subtitle}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(eventDate, 'EEE, MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{format(eventDate, 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{event.venue}, {event.city}</span>
                    </div>
                    {event.tiers.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{event.tiers.length} ticket tier{event.tiers.length > 1 ? 's' : ''} available</span>
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/tickets/event/${event.slug}`}>
                    <Button 
                      className="w-full"
                      variant={soldOut ? "secondary" : "default"}
                      disabled={soldOut}
                      data-testid={`button-view-${event.id}`}
                    >
                      {soldOut ? "Sold Out" : "View Details & Buy"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}