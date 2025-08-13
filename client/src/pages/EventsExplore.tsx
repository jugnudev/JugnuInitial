import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, MapPin, Clock, ExternalLink, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "@/hooks/use-toast";
import Card from "@/components/explore/Card";
import FeaturedHero from "@/components/explore/FeaturedHero";
import PageHero from "@/components/explore/PageHero";
import Toolbar from "@/components/explore/Toolbar";
import EmptyState from "@/components/explore/EmptyState";
import DetailsModal from "@/components/community/DetailsModal";
import FilterDrawer from "@/components/explore/FilterDrawer";
import { SponsoredBanner } from "@/components/spotlight/SponsoredBanner";

const CATEGORIES = [
  { value: 'All', label: 'All Events' },
  { value: 'Concerts', label: 'Concerts' }, 
  { value: 'Club Nights', label: 'Club Nights' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Festivals', label: 'Festivals' },
];

export default function EventsExplore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filters, setFilters] = useState<Record<string, any>>({ range: 'month' });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Extract event ID from URL for deep linking
  const urlParams = new URLSearchParams(window.location.search);
  const eventIdFromUrl = urlParams.get('e');

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/community/weekly', filters.range || 'month', categoryFilter === 'All' ? undefined : categoryFilter.toLowerCase(), searchQuery || undefined],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: filters.range || 'month',
        ...(categoryFilter !== 'All' && { category: categoryFilter.toLowerCase() }),
        ...(searchQuery && { q: searchQuery })
      });
      const response = await fetch(`/api/community/weekly?${params.toString()}`);
      return response.json();
    }
  });

  const events = (data as any)?.items || [];
  const featuredEvent = (data as any)?.featured || null;

  // Filtered events based on search and category
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event: any) =>
        event.title?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.organizer?.toLowerCase().includes(query) ||
        event.category?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'All') {
      const categoryKey = categoryFilter.toLowerCase().replace(' nights', '').replace('s', '');
      filtered = filtered.filter((event: any) =>
        event.category === categoryKey
      );
    }

    return filtered;
  }, [events, searchQuery, categoryFilter]);

  // Handle deep linking
  useEffect(() => {
    if (eventIdFromUrl && events.length > 0) {
      const event = events.find((e: any) => e.id === eventIdFromUrl);
      if (event) {
        setSelectedEvent(event);
        // Clean URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('e');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [eventIdFromUrl, events]);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'South Asian Events in Vancouver',
      text: 'Discover amazing South Asian cultural events happening in Vancouver',
      url: window.location.origin + '/events'
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        // Screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Page shared successfully';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin + '/events');
        toast({
          title: "Link copied!",
          description: "The page link has been copied to your clipboard.",
        });
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast({
          title: "Share failed",
          description: "Unable to copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setFilters({ range: 'month' });
    setIsFilterDrawerOpen(false);
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'All' || filters.range !== 'month';

  return (
    <div className="min-h-screen bg-bg">
      {/* Page Hero */}
      <PageHero
        title="Events"
        subtitle="Discover concerts, festivals, cultural performances & community gatherings in Vancouver."
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Toolbar */}
        <Toolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          segmentOptions={CATEGORIES.map(c => c.value)}
          segmentValue={categoryFilter}
          onSegmentChange={setCategoryFilter}
          onFiltersClick={() => setIsFilterDrawerOpen(true)}
          activeFiltersCount={hasActiveFilters ? 1 : 0}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="mt-10 md:mt-14">
            {/* Featured Loading */}
            <div className="mb-10">
              <div className="w-full aspect-[16/9] bg-white/5 rounded-2xl animate-pulse" />
            </div>
            {/* Grid Loading */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/9] bg-white/5 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-10 md:mt-14 text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <h3 className="text-xl font-semibold text-white">
                Unable to load events
              </h3>
              <p className="text-muted text-base">
                There was a problem loading the events. Please try again later.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-copper-500 hover:bg-copper-600 text-black font-medium"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="mt-10 md:mt-14">
            {/* Featured Hero */}
            {featuredEvent && (
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
            )}

            {/* Sponsored Banner */}
            <SponsoredBanner />

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {filteredEvents.map((event: any, index: number) => (
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
              </motion.div>
            ) : (
              <EmptyState
                type="events"
                hasFilters={hasActiveFilters}
                onAddClick={() => window.location.href = '/events/feature'}
              />
            )}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        type="events"
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Event Detail Modal */}
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