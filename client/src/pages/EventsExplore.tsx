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
import { SponsoredBanner } from "@/components/spotlight/SponsoredBanner";
import { useSavedEventIds } from "@/hooks/useSavedEvents";

const CATEGORIES = [
  { value: 'All', label: 'All Events' },
  { value: 'Concerts', label: 'Concerts' }, 
  { value: 'Parties', label: 'Parties' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Festivals', label: 'Festivals' },
];

export default function EventsExplore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filters, setFilters] = useState<Record<string, any>>({ range: 'all' });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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
            .replace('parties', 'party')     // "Parties" -> "party"
        }),
        ...(searchQuery && { search: searchQuery })
      });
      
      const response = await fetch(`/api/community/weekly?${params}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!data?.items) return [];
    
    let events = data.items;
    
    // Show only saved events if toggle is on
    if (showSavedOnly) {
      events = events.filter((event: any) => savedEventIds.includes(event.id));
    }
    
    return events;
  }, [data?.events, showSavedOnly, savedEventIds]);

  // Get featured event (first event if exists)
  const featuredEvent = useMemo(() => {
    return filteredEvents?.[0] || null;
  }, [filteredEvents]);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return categoryFilter !== 'All' || 
           searchQuery.length > 0 || 
           (filters.range && filters.range !== 'all') ||
           showSavedOnly;
  }, [categoryFilter, searchQuery, filters.range, showSavedOnly]);

  // Deep linking: Auto-open event if URL contains event ID
  useEffect(() => {
    if (eventIdFromUrl && filteredEvents.length > 0) {
      const eventToOpen = filteredEvents.find((event: any) => event.id === eventIdFromUrl);
      if (eventToOpen) {
        setSelectedEvent(eventToOpen);
      }
    }
    
    if (savedFromUrl) {
      setShowSavedOnly(true);
    }
  }, [eventIdFromUrl, savedFromUrl, filteredEvents]);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    
    // Update URL with event ID for deep linking
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('e', event.id);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
    
    // Remove event ID from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('e');
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setFilters({ range: 'all' });
    setShowSavedOnly(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-emerald-950 text-white relative">
      {/* Page Hero */}
      <PageHero 
        title="Community Events"
        subtitle="Discover amazing events happening in your community"
      />

      {/* Toolbar */}
      <div className="relative z-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Toolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            segmentOptions={CATEGORIES.map(cat => cat.label)}
            segmentValue={categoryFilter}
            onSegmentChange={setCategoryFilter}
            showSavedOnly={showSavedOnly}
            onSavedToggle={() => setShowSavedOnly(!showSavedOnly)}
            savedCount={savedEventIds.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 md:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          
        {/* Loading State */}
        {isLoading && (
          <div className="mt-10 md:mt-14">
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
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
            {/* Sponsored Banner - positioned above all content */}
            <div className="mb-8">
              <SponsoredBanner />
            </div>

            {/* Featured Hero */}
            {featuredEvent && (
              <FeaturedHero
                item={{
                  ...featuredEvent,
                  type: 'event' as const,
                  name: featuredEvent.title,
                  venue: featuredEvent.venue || '',
                  date: featuredEvent.start_at || featuredEvent.date,
                  is_all_day: Boolean(featuredEvent.is_all_day === 'string' ? featuredEvent.is_all_day === 'true' : Boolean(featuredEvent.is_all_day)),
                }}
                onViewDetails={() => handleEventClick(featuredEvent)}
              />
            )}

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
              <>
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
                        is_all_day: Boolean(event.is_all_day === 'string' ? event.is_all_day === 'true' : Boolean(event.is_all_day)),
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
                <EmptyState
                  type="events"
                  hasFilters={hasActiveFilters}
                  showSavedOnly={showSavedOnly}
                  onAddClick={() => window.location.href = '/events/feature'}
                />
              </>
            )}
          </div>
        )}
      </div>
      </div>

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