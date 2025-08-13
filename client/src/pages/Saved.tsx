import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, ExternalLink } from "lucide-react";
import { useFavorites } from "@/stores/favorites";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Card from "@/components/explore/Card";
import DetailsModal from "@/components/community/DetailsModal";
import DetailsModalPlace from "@/components/places/DetailsModalPlace";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  date: string;
  start_at?: string;
  end_at?: string;
  is_all_day?: boolean | string;
  timezone?: string;
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

export default function Saved() {
  const [activeTab, setActiveTab] = useState<'events' | 'places'>('events');
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const { getFavoriteEvents, getFavoritePlaces } = useFavorites();
  
  const favoriteEventIds = getFavoriteEvents();
  const favoritePlaceIds = getFavoritePlaces();

  // Fetch favorite events using v3.3 by-ids endpoint
  const { data: favoriteEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events/by-ids', { ids: favoriteEventIds.join(',') }],
    enabled: favoriteEventIds.length > 0,
    select: (data: any) => data || []
  });

  // Fetch favorite places using v3.3 by-ids endpoint
  const { data: favoritePlaces = [], isLoading: placesLoading } = useQuery({
    queryKey: ['/api/places/by-ids', { ids: favoritePlaceIds.join(',') }],
    enabled: favoritePlaceIds.length > 0,
    select: (data: any) => data || []
  });

  const handleEventClick = (event: CommunityEvent) => {
    setSelectedEvent(event);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
    setSelectedPlace(null);
  };

  const hasEventFavorites = favoriteEventIds.length > 0;
  const hasPlaceFavorites = favoritePlaceIds.length > 0;
  const hasFavorites = hasEventFavorites || hasPlaceFavorites;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-gradient-to-b from-bg to-bg/95 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-copper-500 fill-current" />
            <h1 className="text-4xl sm:text-5xl font-fraunces font-bold text-white">
              Saved
            </h1>
          </div>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Your curated collection of favorite events and places
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-8">
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/5 rounded-full p-1 inline-flex">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                activeTab === 'events'
                  ? 'bg-copper-500 text-black shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
              data-testid="tab-events"
            >
              Events
              {hasEventFavorites && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                  {favoriteEventIds.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('places')}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                activeTab === 'places'
                  ? 'bg-copper-500 text-black shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
              data-testid="tab-places"
            >
              Places
              {hasPlaceFavorites && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                  {favoritePlaceIds.length}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {eventsLoading && hasEventFavorites && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[16/9] bg-white/5 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {!eventsLoading && favoriteEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(favoriteEvents as any[]).map((event: any, index: number) => (
                  <Card
                    key={event.id}
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
                ))}
              </div>
            )}

            {!hasEventFavorites && (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No saved events yet
                </h3>
                <p className="text-muted mb-6">
                  Discover amazing South Asian events and save your favorites
                </p>
                <Button
                  onClick={() => window.location.href = '/events'}
                  className="bg-copper-500 hover:bg-copper-600 text-black font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Explore Events
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Places Tab */}
        {activeTab === 'places' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {placesLoading && hasPlaceFavorites && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[16/9] bg-white/5 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {!placesLoading && favoritePlaces.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(favoritePlaces as any[]).map((place: any, index: number) => (
                  <Card
                    key={place.id}
                    item={{
                      ...place,
                      type: 'place' as const,
                      place_type: place.type || 'restaurant'
                    }}
                    onClick={() => handlePlaceClick(place)}
                    index={index}
                    showFavorite={true}
                  />
                ))}
              </div>
            )}

            {!hasPlaceFavorites && (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No saved places yet
                </h3>
                <p className="text-muted mb-6">
                  Discover authentic South Asian restaurants, cafes, and cultural spots
                </p>
                <Button
                  onClick={() => window.location.href = '/places'}
                  className="bg-copper-500 hover:bg-copper-600 text-black font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Explore Places
                </Button>
              </div>
            )}
          </motion.div>
        )}
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
    </div>
  );
}