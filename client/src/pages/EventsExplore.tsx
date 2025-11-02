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
// FilterDrawer removed
import { SponsoredBanner } from "@/components/spotlight/SponsoredBanner";
import { useSavedEventIds } from "@/hooks/useSavedEvents";

const CATEGORIES = [
  { value: 'All', label: 'All Events' },
  { value: 'Concerts', label: 'Concerts' }, 
  { value: 'Parties', label: 'Parties' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Festivals', label: 'Festivals' },
  { value: 'Other', label: 'Other' },
];

export default function EventsExplore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filters, setFilters] = useState<Record<string, any>>({ range: 'all' });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  // Filter drawer removed
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');

  // Saved events functionality
  const { ids: savedEventIds, toggle: toggleSaved, isEventSaved } = useSavedEventIds();

  // Extract event ID from URL for deep linking
  const urlParams = new URLSearchParams(window.location.search);
  const eventIdFromUrl = urlParams.get('e');
  const savedFromUrl = urlParams.get('saved') === '1';

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/community/weekly', filters.range || 'month', categoryFilter === 'All' ? undefined : categoryFilter.toLowerCase(), searchQuery || undefined],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: filters.range || 'all',
        ...(categoryFilter !== 'All' && { 
          // Map frontend category names to backend category values
          category: categoryFilter.toLowerCase()
            .replace('concerts', 'concert')  // "Concerts" -> "concert"
            .replace('festivals', 'festival')  // "Festivals" -> "festival"
            // "parties" stays as "parties" - no transformation needed
        }),
        ...(searchQuery && { q: searchQuery })
      });
      const response = await fetch(`/api/community/weekly?${params.toString()}`);
      return response.json();
    }
  });

  const events = (data as any)?.items || [];
  const featuredEvent = (data as any)?.featured || null;

  // Filtered events based on search, category, and saved filter
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

    // NOTE: The category filtering is already done by the API
    // We don't need to filter again on the frontend
    // The API handles the category mapping correctly

    // Filter by saved events if enabled
    if (showSavedOnly) {
      filtered = filtered.filter((event: any) => 
        savedEventIds.includes(event.id)
      );
    }

    return filtered;
  }, [events, searchQuery, categoryFilter, showSavedOnly, savedEventIds]);

  // Handle deep linking and saved filter from URL
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

  // Handle saved filter from URL parameter
  useEffect(() => {
    if (savedFromUrl) {
      setShowSavedOnly(true);
    }
  }, [savedFromUrl]);

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
    setFilters({ range: 'all' });
    setShowSavedOnly(false);
    // Update URL to remove saved parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('saved');
    window.history.replaceState({}, '', url.toString());
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'All' || filters.range !== 'all' || showSavedOnly;

  return (
    <div className="min-h-screen bg-bg">
      {/* Page Hero */}
      <PageHero
        title="Events"
        subtitle="Discover concerts, festivals, cultural performances & community gatherings across Canada."
        actions={
          <button
            onClick={() => window.location.href = '/events/feature'}
            className="text-sm text-muted hover:text-primary transition-colors underline underline-offset-4 decoration-1 hover:decoration-primary"
            data-testid="button-request-listing-hero"
          >
            Don't see your event? Request to have it listed
          </button>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Toolbar */}
        <Toolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          segmentOptions={CATEGORIES.map(c => c.value)}
          segmentValue={categoryFilter}
          onSegmentChange={setCategoryFilter}
          // onFiltersClick removed
          activeFiltersCount={hasActiveFilters ? 1 : 0}
          showSavedOnly={showSavedOnly}
          onSavedToggle={() => {
            const newShowSaved = !showSavedOnly;
            setShowSavedOnly(newShowSaved);
            // Update URL to include/remove saved parameter
            const url = new URL(window.location.href);
            if (newShowSaved) {
              url.searchParams.set('saved', '1');
            } else {
              url.searchParams.delete('saved');
            }
            window.history.replaceState({}, '', url.toString());
          }}
          savedCount={savedEventIds.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
                  is_all_day: Boolean(featuredEvent.is_all_day === 'true' || featuredEvent.is_all_day === true),
                }}
                onViewDetails={() => handleEventClick(featuredEvent)}
              />
            )}

            {/* Sponsored Banner - placement varies by event count */}

            {/* Events Grid with Dynamic Banner Placement */}
            {filteredEvents.length > 0 ? (
              <>
                {/* Sponsored Banner above events grid */}
                <div className="mb-8">
                  <SponsoredBanner />
                </div>
                
                <motion.div 
                  className={`grid gap-4 md:gap-6 ${
                    viewMode === 'compact' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 md:grid-cols-2'
                  }`}
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
                        is_all_day: Boolean(event.is_all_day === 'true' || event.is_all_day === true),
                      }}
                      onClick={() => handleEventClick(event)}
                      index={index}
                      showFavorite={true}
                      onToggleSave={() => toggleSaved(event.id)}
                      isSaved={isEventSaved(event.id)}
                    />
                  ))}
                </motion.div>
                
                {/* Don't see your event CTA */}
                <div className="mt-12 mb-8 text-center">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 max-w-lg mx-auto">
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Don't see your event?
                    </h3>
                    <p className="text-muted mb-6">
                      Submit your event for consideration to be featured on our platform
                    </p>
                    <button
                      onClick={() => window.location.href = '/events/feature'}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-copper-500 hover:bg-copper-600 text-black font-medium rounded-xl transition-colors"
                      data-testid="button-request-listing"
                    >
                      Request to have it listed
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Banner inside empty state */}
                <EmptyState
                  type="events"
                  hasFilters={hasActiveFilters}
                  showSavedOnly={showSavedOnly}
                  onAddClick={() => window.location.href = '/events/feature'}
                />
                <SponsoredBanner />
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter Drawer removed */}

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