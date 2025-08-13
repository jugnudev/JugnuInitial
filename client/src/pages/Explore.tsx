import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Card from "@/components/explore/Card";
import DetailsModal from "@/components/community/DetailsModal";
import DetailsModalPlace from "@/components/places/DetailsModalPlace";
import { formatDateBadge, formatTimeRange } from "@/lib/dates";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  date: string;
  start_at: string;
  end_at?: string;
  is_all_day?: boolean | string;
  timezone: string;
  city: string;
  category?: string;
  buyUrl?: string;
  eventbriteId?: string;
  ticketTailorId?: string;
  priceFrom?: string;
  image_url?: string;
  tags?: string[];
  featured: boolean;
  sponsored: boolean;
  sponsored_until?: string;
  status?: string;
}

interface Place {
  id: string;
  name: string;
  type: string;
  description?: string;
  neighborhood?: string;
  city: string;
  website_url?: string;
  booking_url?: string;
  price_level?: number;
  image_url?: string;
  tags?: string[];
  featured: boolean;
  sponsored: boolean;
  sponsored_until?: string;
  status?: string;
}

export default function Explore() {
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const placesScrollRef = useRef<HTMLDivElement>(null);

  // Fetch events for "Happening This Week" rail
  const { data: eventsData, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useQuery({
    queryKey: ['/api/community/weekly', 'week'],
    queryFn: async () => {
      const params = new URLSearchParams({ range: 'week' });
      const response = await fetch(`/api/community/weekly?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch events: ${response.status}`);
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch places for "Trending Places" rail  
  const { data: placesData, isLoading: placesLoading, error: placesError, refetch: refetchPlaces } = useQuery({
    queryKey: ['/api/places/list'],
    queryFn: async () => {
      const response = await fetch('/api/places/list');
      if (!response.ok) throw new Error(`Failed to fetch places: ${response.status}`);
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const events = (eventsData as any)?.items?.slice(0, 10) || [];
  const places = (placesData as any)?.items?.slice(0, 10) || [];

  const handleEventClick = (event: CommunityEvent) => {
    setSelectedEvent(event);
    // Update URL with deep link
    const url = new URL(window.location.href);
    url.searchParams.set('e', event.id);
    window.history.pushState({}, '', url.toString());
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    // Update URL with deep link
    const url = new URL(window.location.href);
    url.searchParams.set('p', place.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
    setSelectedPlace(null);
    // Remove query params when closing modal
    const url = new URL(window.location.href);
    url.searchParams.delete('e');
    url.searchParams.delete('p');
    window.history.pushState({}, '', url.toString());
  };

  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Handle deep linking on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('e');
    const placeId = urlParams.get('p');

    if (eventId && events.length > 0) {
      const event = events.find((e: any) => e.id === eventId);
      if (event) setSelectedEvent(event);
    }

    if (placeId && places.length > 0) {
      const place = places.find((p: any) => p.id === placeId);
      if (place) setSelectedPlace(place);
    }
  }, [events, places]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-copper-500/20 via-copper-600/10 to-bg py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-fraunces font-bold text-white mb-6 tracking-tight leading-tight">
              Find Your Frequency
              <br />
              <span className="text-copper-400">in Vancouver</span>
            </h1>
            <p className="text-xl text-muted max-w-3xl mx-auto mb-8 leading-relaxed">
              Discover the vibrant cultural pulse of Vancouver through curated events and authentic places
              that celebrate South Asian culture and global music experiences.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-8">
        {/* Happening This Week Rail */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-fraunces font-bold text-white">
              Happening This Week
            </h2>
            <div className="flex items-center gap-4">
              {/* Desktop scroll arrows */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollLeft(eventsScrollRef)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  data-testid="events-scroll-left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollRight(eventsScrollRef)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  data-testid="events-scroll-right"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => window.location.href = '/events'}
                className="bg-copper-500 hover:bg-copper-600 text-black font-medium"
                data-testid="cta-see-all-events"
              >
                See all events
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex gap-6 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-80 aspect-[16/9] bg-white/5 rounded-2xl animate-pulse relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                </div>
              ))}
            </div>
          ) : eventsError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-white text-lg mb-2">Unable to load events</p>
              <p className="text-muted text-sm mb-4">Please check your connection and try again</p>
              <Button
                onClick={() => refetchEvents()}
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            </div>
          ) : (
            <div 
              ref={eventsScrollRef}
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {events.map((event: any, index: number) => (
                <div key={event.id} className="min-w-80 snap-start">
                  <Card
                    item={{
                      ...event,
                      type: 'event' as const,
                      name: event.title,
                      venue: event.venue || '',
                      date: event.start_at || event.date,
                      is_all_day: typeof event.is_all_day === 'string' ? event.is_all_day === 'true' : Boolean(event.is_all_day),
                    }}
                    onClick={() => handleEventClick(event)}
                    index={index}
                    showFavorite={true}
                  />
                </div>
              ))}
              {events.length === 0 && (
                <div className="w-full text-center py-12 text-muted">
                  <p>No events happening this week</p>
                  <Button
                    onClick={() => window.location.href = '/events'}
                    variant="outline"
                    className="mt-4 border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  >
                    View all events
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Trending Places Rail */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-fraunces font-bold text-white">
              Trending Places
            </h2>
            <div className="flex items-center gap-4">
              {/* Desktop scroll arrows */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollLeft(placesScrollRef)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  data-testid="places-scroll-left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollRight(placesScrollRef)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  data-testid="places-scroll-right"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => window.location.href = '/places'}
                className="bg-copper-500 hover:bg-copper-600 text-black font-medium"
                data-testid="cta-see-all-places"
              >
                See all places
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {placesLoading ? (
            <div className="flex gap-6 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-80 aspect-[16/9] bg-white/5 rounded-2xl animate-pulse relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                </div>
              ))}
            </div>
          ) : placesError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-white text-lg mb-2">Unable to load places</p>
              <p className="text-muted text-sm mb-4">Please check your connection and try again</p>
              <Button
                onClick={() => refetchPlaces()}
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            </div>
          ) : (
            <div 
              ref={placesScrollRef}
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {places.map((place: any, index: number) => (
                <div key={place.id} className="min-w-80 snap-start">
                  <Card
                    item={{
                      ...place,
                      type: 'place' as const,
                      place_type: place.type || 'restaurant'
                    }}
                    onClick={() => handlePlaceClick(place)}
                    index={index}
                    showFavorite={true}
                  />
                </div>
              ))}
              {places.length === 0 && (
                <div className="w-full text-center py-12 text-muted">
                  <p>No places available</p>
                  <Button
                    onClick={() => window.location.href = '/places'}
                    variant="outline"
                    className="mt-4 border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  >
                    View all places
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.section>
      </div>

      {/* Modals */}
      {selectedEvent && (
        <DetailsModal
          isOpen={!!selectedEvent}
          onClose={handleModalClose}
          event={selectedEvent}
        />
      )}

      {selectedPlace && (
        <DetailsModalPlace
          isOpen={!!selectedPlace}
          onClose={handleModalClose}
          place={selectedPlace}
        />
      )}

      <style>
        {`.scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }`}
      </style>
    </div>
  );
}