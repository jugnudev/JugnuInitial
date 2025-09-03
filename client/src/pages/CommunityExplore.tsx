import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import PageHero from "@/components/explore/PageHero";
import Toolbar from "@/components/explore/Toolbar";
import FilterDrawer from "@/components/explore/FilterDrawer";
import FeaturedHero from "@/components/explore/FeaturedHero";
import Card from "@/components/explore/Card";
import EmptyState from "@/components/explore/EmptyState";
import DetailsModal from "@/components/community/DetailsModal";

import { Button } from "@/components/ui/button";
import { EVENT_CATEGORIES } from "@/lib/taxonomy";
import { ExternalLink } from "lucide-react";

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
  organizer?: string;
  source_url?: string;
}

interface EventsResponse {
  featured: CommunityEvent | null;
  items: CommunityEvent[];
  total: number;
}

export default function CommunityExplore() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [filters, setFilters] = useState<Record<string, any>>({ range: 'month' });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (selectedCategory && selectedCategory !== "All") {
      params.set("category", selectedCategory.toLowerCase());
    }
    
    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    }
    
    // Range filter (week/month)
    params.set("range", filters.range || 'month');
    
    if (filters.neighborhoods?.length) {
      params.set("neighborhoods", filters.neighborhoods.join(","));
    }
    
    if (filters.tags?.length) {
      params.set("tags", filters.tags.join(","));
    }
    
    return params.toString();
  }, [selectedCategory, searchValue, filters]);

  // Fetch events data
  const { data, isLoading, error } = useQuery<EventsResponse>({
    queryKey: ["community-events", queryParams],
    queryFn: async () => {
      const url = `/api/community/weekly${queryParams ? `?${queryParams}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.neighborhoods?.length) count += filters.neighborhoods.length;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.range && filters.range !== 'month') count += 1;
    return count;
  }, [filters]);

  const handleEventClick = (event: CommunityEvent) => {
    setSelectedEvent(event);
    
    // Update URL for deep linking
    const url = new URL(window.location.href);
    url.searchParams.set("e", event.id);
    window.history.pushState({}, "", url.toString());
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
    
    // Remove deep link parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("e");
    window.history.pushState({}, "", url.toString());
  };

  // Handle deep linking on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("e");
    
    if (eventId && data?.items) {
      const event = data.items.find(e => e.id === eventId) || 
                   (data.featured?.id === eventId ? data.featured : null);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [data]);

  const events = data?.items || [];
  const featuredEvent = data?.featured;
  const hasResults = events.length > 0 || !!featuredEvent;
  const hasFilters = activeFiltersCount > 0 || searchValue.trim() || selectedCategory !== "All";

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHero
          title="South Asian Events"
          subtitle="Discover concerts, festivals, cultural performances and community gatherings in Vancouver"
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Unable to Load Events
            </h3>
            <p className="text-muted">
              We're having trouble loading the community events. Please check back soon!
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-black"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Page Hero */}
      <PageHero
        title="South Asian Events"
        subtitle="Discover concerts, festivals, cultural performances and community gatherings in Vancouver"
        actions={
          <Button
            onClick={() => window.open("/community/feature", "_blank")}
            className="bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_hsla(28,89%,57%,0.3)] text-black font-medium px-6 py-3 transition-all duration-300"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Request Featured
          </Button>
        }
      />



      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 mt-10 md:mt-14">
        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          segmentOptions={EVENT_CATEGORIES}
          segmentValue={selectedCategory}
          onSegmentChange={setSelectedCategory}
          onFiltersClick={() => setIsFiltersOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[16/9] bg-white/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Featured Hero */}
        {!isLoading && featuredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <FeaturedHero
              item={{
                ...featuredEvent,
                type: 'event' as const,
                name: featuredEvent.title,
                venue: featuredEvent.venue || '',
                date: featuredEvent.start_at || featuredEvent.date,
                is_all_day: typeof featuredEvent.is_all_day === 'string' ? featuredEvent.is_all_day === 'true' : Boolean(featuredEvent.is_all_day),
              }}
              onViewDetails={() => handleEventClick(featuredEvent)}
            />
          </motion.div>
        )}

        {/* Events Grid */}
        {!isLoading && hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {events.map((event, index) => (
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

        {/* Empty State */}
        {!isLoading && !hasResults && (
          <EmptyState
            type="events"
            hasFilters={hasFilters}
            onAddClick={() => window.open("/community/feature", "_blank")}
          />
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        type="events"
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Event Details Modal */}
      {selectedEvent && (
        <DetailsModal
          isOpen={!!selectedEvent}
          onClose={handleModalClose}
          event={selectedEvent}
        />
      )}
    </div>
  );
}