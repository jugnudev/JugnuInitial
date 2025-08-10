import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, ExternalLink, Clock, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { getCalendarLinks } from "@/lib/calendar";
import DetailsModal from "@/components/community/DetailsModal";
import { useLocation } from "wouter";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  startAt: string;
  endAt?: string;
  venue?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  organizer?: string;
  ticketsUrl?: string;
  sourceUrl?: string;
  imageUrl?: string;
  priceFrom?: string;
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

  const events: CommunityEvent[] = data?.events || [];

  // Deep linking - check for event ID in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const eventId = params.get('e');
    
    if (eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setIsModalOpen(true);
      }
    }
  }, [location, events]);

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

  const formatEventDate = (startAt: string) => {
    try {
      const date = new Date(startAt);
      if (isNaN(date.getTime())) {
        return "TBA";
      }
      const dayOfWeek = format(date, "EEE").toUpperCase();
      const monthDay = format(date, "MMM d").toUpperCase();
      return `${dayOfWeek} • ${monthDay}`;
    } catch (error) {
      console.error("Error formatting date:", startAt, error);
      return "TBA";
    }
  };

  const formatEventTime = (startAt: string, endAt?: string) => {
    try {
      const start = new Date(startAt);
      if (isNaN(start.getTime())) {
        return "Time TBA";
      }
      const startTime = format(start, "h:mm a");
      
      if (endAt) {
        const end = new Date(endAt);
        if (!isNaN(end.getTime())) {
          const endTime = format(end, "h:mm a");
          return `${startTime} - ${endTime}`;
        }
      }
      
      return startTime;
    } catch (error) {
      console.error("Error formatting time:", startAt, endAt, error);
      return "Time TBA";
    }
  };

  const renderEventCard = (event: CommunityEvent) => (
    <button
      key={event.id}
      onClick={() => openModal(event)}
      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors duration-200 text-left group cursor-pointer"
      data-testid={`card-event-${event.id}`}
    >
      {/* Event Image */}
      <div className="mb-4">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover rounded-2xl"
            loading="lazy"
          />
        ) : (
          <div className="relative w-full h-48 bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 rounded-2xl overflow-hidden">
            {/* Firefly glow effect */}
            <div className="absolute inset-0">
              <div className="firefly-small absolute top-6 left-8 w-2 h-2 bg-[#c05a0e]/60 rounded-full animate-pulse"></div>
              <div className="firefly-small absolute bottom-8 right-12 w-1.5 h-1.5 bg-[#d4691a]/50 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }}></div>
              <div className="firefly-small absolute top-12 right-6 w-1 h-1 bg-[#b8540d]/70 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
            <div className="flex items-center justify-center h-full relative z-10">
              <Calendar className="w-12 h-12 text-[#c05a0e]/80" />
            </div>
          </div>
        )}
      </div>

      {/* Date Badge */}
      <div className="inline-flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium mb-3">
        {formatEventDate(event.startAt)}
      </div>

      {/* Event Title and Price */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-fraunces text-xl font-bold text-white leading-tight pr-4 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        {event.priceFrom && parseFloat(event.priceFrom) > 0 && (
          <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-lg text-sm font-medium shrink-0">
            <DollarSign className="w-3 h-3" />
            {event.priceFrom}
          </div>
        )}
      </div>

      {/* Venue and Time */}
      <div className="space-y-2 mb-4">
        {event.venue && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">{event.venue}</p>
              {event.address && (
                <p className="text-muted text-xs">{event.address}</p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <p className="text-muted text-sm">{formatEventTime(event.startAt, event.endAt)}</p>
        </div>
      </div>

      {/* Organizer */}
      {event.organizer && (
        <p className="text-muted text-sm mb-4">by {event.organizer}</p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-muted text-sm group-hover:text-white transition-colors">
          See details
        </div>
        
        {event.ticketsUrl && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              window.open(event.ticketsUrl, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center px-4 py-2 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors duration-200 text-sm"
            data-testid={`button-tickets-${event.id}`}
          >
            Get Tickets
            <ExternalLink className="w-3 h-3 ml-1" />
          </div>
        )}
      </div>
    </button>
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

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
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

          {/* Events Grid */}
          {!isLoading && !error && events.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map(renderEventCard)}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="font-fraunces text-2xl font-bold text-white mb-2">
                No events this week
              </h3>
              <p className="text-muted max-w-md mx-auto mb-6">
                No listings for the next 7 days. Check back soon or follow @thehouseofjugnu.
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