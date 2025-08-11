import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, ExternalLink, Clock, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { getCalendarLinks } from "@/lib/calendar";
import DetailsModal from "@/components/community/DetailsModal";
import FeaturedHero from "@/components/community/FeaturedHero";
import { useLocation } from "wouter";
import { formatDateBadge, formatTime } from "@/utils/dateFormatters";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  start_at: string;
  end_at?: string;
  timezone: string;
  is_all_day?: boolean;
  venue?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  organizer?: string;
  tickets_url?: string;
  source_url?: string;
  image_url?: string;
  price_from?: string;
  tags?: string[];
  status: string;
}

const categoryFilters = [
  { label: "All", value: "" },
  { label: "Concert", value: "concert" },
  { label: "Club", value: "club" },
  { label: "Comedy", value: "comedy" },
  { label: "Festival", value: "festival" },
];

export default function Community() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [location, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/community/weekly", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/community/weekly?category=${encodeURIComponent(selectedCategory)}`
        : "/api/community/weekly";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  // v2.8 API response format
  const featured: CommunityEvent | null = data?.featured || null;
  const events: CommunityEvent[] = data?.items || [];

  // Deep linking - check for event ID in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const eventId = params.get('e');
    
    if (eventId) {
      // Check both featured and regular events
      const allEvents = [...(featured ? [featured] : []), ...events];
      const event = allEvents.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setIsModalOpen(true);
      }
    }
  }, [location, featured, events]);

  const openModal = (event: CommunityEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    // Add query parameter for deep linking
    const params = new URLSearchParams(location.split('?')[1] || '');
    params.set('e', event.id);
    navigate(`/community?${params.toString()}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    // Remove query parameter
    const params = new URLSearchParams(location.split('?')[1] || '');
    params.delete('e');
    const newQuery = params.toString();
    navigate(newQuery ? `/community?${newQuery}` : '/community');
  };

  // Use the new timezone-aware formatters

  const renderEventCard = (event: CommunityEvent) => (
    <div
      key={event.id}
      onClick={() => openModal(event)}
      className="group w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-copper-500/30 hover:shadow-lg hover:shadow-copper-500/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer min-h-12"
      data-testid={`card-event-${event.id}`}
    >
      {/* Event Image with 16:9 aspect ratio */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-12 h-12 text-[#c05a0e]/80" />
          </div>
        )}
        
        {/* Soft copper gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Date chip - top left */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs rounded-md font-medium">
          {formatDateBadge(event.start_at, event.timezone)}
        </div>
        
        {/* Category pill - top right */}
        {event.category && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-primary/90 text-black text-xs rounded-full font-medium capitalize">
            {event.category}
          </div>
        )}
        
        {/* Bottom overlay with content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 mb-1">
            {event.title}
          </h3>
          <p className="text-white/80 text-sm mb-2">
            {event.venue ? `${event.venue} • ${event.city}` : event.city}
          </p>
          
          {/* Price display */}
          {event.price_from && parseFloat(event.price_from) > 0 && (
            <div className="text-white/90 text-sm font-medium mb-2">
              from ${event.price_from}
            </div>
          )}
          
          {/* Small Get Tickets button if tickets_url exists */}
          {event.tickets_url && (
            <div className="flex justify-end">
              <div 
                className="px-3 py-1 bg-primary/90 text-black text-xs rounded font-medium hover:bg-primary transition-colors min-h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(event.tickets_url, '_blank', 'noopener,noreferrer');
                }}
              >
                Get Tickets
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-bg text-text py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#c05a0e]">
              South Asian Events in Vancouver
            </h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">This Month</p>
            <p className="text-lg text-muted/80 max-w-2xl mx-auto mt-2">Concerts, club nights, comedy, festivals and more! Community-curated.</p>
          </div>

          {/* Category Filters + Request Feature Link */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            <div className="flex flex-wrap justify-center gap-3">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedCategory(filter.value)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${
                    selectedCategory === filter.value
                      ? "bg-primary text-black"
                      : "bg-white/10 text-text hover:bg-white/20"
                  }`}
                  data-testid={`filter-${filter.value || "all"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            {/* Request Feature Link */}
            <div className="border-l border-white/20 pl-3 ml-3">
              <a
                href="/community/feature"
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                data-testid="link-request-feature"
              >
                Request Feature
              </a>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted mt-4">Loading events...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-400">Failed to load events. Please try again later.</p>
            </div>
          )}

          {/* v2.8 Featured Hero */}
          {!isLoading && !error && featured && (
            <div className="mb-12">
              <FeaturedHero 
                event={featured} 
                onViewDetails={() => openModal(featured)} 
              />
            </div>
          )}

          {/* v2.8 Events Grid - 2 columns on desktop */}
          {!isLoading && !error && events.length > 0 && (
            <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
              {events.map(renderEventCard)}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && events.length === 0 && !featured && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="font-fraunces text-2xl font-bold text-white mb-2">
                {selectedCategory ? `No ${selectedCategory} events this month` : 'No events this month'}
              </h3>
              <p className="text-muted max-w-md mx-auto mb-6">
                {selectedCategory 
                  ? `No ${selectedCategory} events in the next 30 days. Try another category or check back soon.`
                  : 'No listings for the next 30 days. Check back soon or follow @thehouseofjugnu.'
                }
              </p>
              <a
                href="https://instagram.com/thehouseofjugnu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors duration-200"
                data-testid="link-instagram"
              >
                Follow @thehouseofjugnu
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <DetailsModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </Layout>
  );
}