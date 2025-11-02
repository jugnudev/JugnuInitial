import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import PageHero from "@/components/explore/PageHero";
import Toolbar from "@/components/explore/Toolbar";
import FilterDrawer from "@/components/explore/FilterDrawer";
import FeaturedHero from "@/components/explore/FeaturedHero";
import Card from "@/components/explore/Card";
import EmptyState from "@/components/explore/EmptyState";
import DetailsModalPlace from "@/components/places/DetailsModalPlace";

import { Button } from "@/components/ui/button";
import { PLACE_GROUPS, groupToApiParam, apiParamToGroup } from "@/lib/taxonomy";
import { ExternalLink } from "lucide-react";

interface Place {
  id: string;
  name: string;
  type: string;
  place_type: string;
  description?: string;
  neighborhood?: string;
  city: string;
  address?: string;
  website_url?: string;
  booking_url?: string;
  image_url?: string;
  price_level?: number;
  tags?: string[];
  featured: boolean;
  sponsored: boolean;
  sponsored_until?: string;
  status: string;
}

interface PlacesResponse {
  featured: Place | null;
  items: Place[];
  total: number;
}

export default function PlacesExplore() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (selectedGroup && selectedGroup !== "All") {
      params.set("group", groupToApiParam(selectedGroup as any));
    }
    
    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    }
    
    if (filters.neighborhoods?.length) {
      params.set("neighborhoods", filters.neighborhoods.join(","));
    }
    
    if (filters.priceLevels?.length) {
      params.set("price_levels", filters.priceLevels.join(","));
    }
    
    if (filters.tags?.length) {
      params.set("tags", filters.tags.join(","));
    }
    
    return params.toString();
  }, [selectedGroup, searchValue, filters]);

  // Fetch places data
  const { data, isLoading, error } = useQuery<PlacesResponse>({
    queryKey: ["places", queryParams],
    queryFn: async () => {
      const url = `/api/places/list${queryParams ? `?${queryParams}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch places");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.neighborhoods?.length) count += filters.neighborhoods.length;
    if (filters.priceLevels?.length) count += filters.priceLevels.length;
    if (filters.tags?.length) count += filters.tags.length;
    return count;
  }, [filters]);

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    
    // Update URL for deep linking
    const url = new URL(window.location.href);
    url.searchParams.set("p", place.id);
    window.history.pushState({}, "", url.toString());
  };

  const handleModalClose = () => {
    setSelectedPlace(null);
    
    // Remove deep link parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("p");
    window.history.pushState({}, "", url.toString());
  };

  // Handle deep linking on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get("p");
    
    if (placeId && data?.items) {
      const place = data.items.find(p => p.id === placeId) || 
                   (data.featured?.id === placeId ? data.featured : null);
      if (place) {
        setSelectedPlace(place);
      }
    }
  }, [data]);

  const places = data?.items || [];
  const featuredPlace = data?.featured;
  const hasResults = places.length > 0 || !!featuredPlace;
  const hasFilters = activeFiltersCount > 0 || searchValue.trim() || selectedGroup !== "All";

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHero
          title="South Asian Places"
          subtitle="Discover authentic restaurants, cafés, shops & cultural spaces across Canada."
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Unable to Load Places
            </h3>
            <p className="text-muted">
              We're working on setting up the places database. Please check back soon!
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
        title="South Asian Places"
        subtitle="Discover authentic restaurants, cafés, shops & cultural spaces across Canada."
        actions={
          <Button
            onClick={() => window.open("/places/submit", "_blank")}
            className="bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_hsla(28,89%,57%,0.3)] text-black font-medium px-6 py-3 transition-all duration-300"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            List Your Place
          </Button>
        }
      />



      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 mt-10 md:mt-14">
        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          segmentOptions={PLACE_GROUPS}
          segmentValue={selectedGroup}
          onSegmentChange={setSelectedGroup}
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
        {!isLoading && featuredPlace && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <FeaturedHero
              item={{
                ...featuredPlace,
                type: 'place' as const,
                place_type: featuredPlace.type || 'restaurant'
              }}
              onViewDetails={() => handlePlaceClick(featuredPlace)}
            />
          </motion.div>
        )}

        {/* Places Grid */}
        {!isLoading && hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {places.map((place, index) => (
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

        {/* Empty State */}
        {!isLoading && !hasResults && (
          <EmptyState
            type="places"
            hasFilters={hasFilters}
            onAddClick={() => window.open("/places/submit", "_blank")}
          />
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        type="places"
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Place Details Modal */}
      {selectedPlace && (
        <DetailsModalPlace
          isOpen={!!selectedPlace}
          onClose={handleModalClose}
          place={selectedPlace!}
        />
      )}
    </div>
  );
}