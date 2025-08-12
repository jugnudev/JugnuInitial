import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import FeaturedHeroPlace from "@/components/places/FeaturedHeroPlace";
import PlaceCard from "@/components/places/PlaceCard";
import DetailsModalPlace from "@/components/places/DetailsModalPlace";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Place {
  id: string;
  name: string;
  type: string;
  description?: string;
  neighborhood?: string;
  address?: string;
  city: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website_url?: string;
  booking_url?: string;
  delivery_urls?: { [key: string]: string };
  instagram?: string;
  price_level?: number;
  tags?: string[];
  image_url?: string;
  gallery?: string[];
  source_url?: string;
  featured: boolean;
  sponsored: boolean;
  sponsored_until?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const typeFilters = [
  { value: "all", label: "All Places" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "dessert", label: "Dessert" },
  { value: "grocer", label: "Grocer" },
  { value: "fashion", label: "Fashion" },
  { value: "beauty", label: "Beauty" },
  { value: "dance", label: "Dance" },
  { value: "temple", label: "Temple" },
  { value: "gurdwara", label: "Gurdwara" },
  { value: "mosque", label: "Mosque" },
  { value: "gallery", label: "Gallery" },
  { value: "org", label: "Organization" },
];

const neighborhoodOptions = [
  { value: "all", label: "All Areas" },
  { value: "Downtown", label: "Downtown" },
  { value: "Gastown", label: "Gastown" },
  { value: "Kitsilano", label: "Kitsilano" },
  { value: "Burnaby", label: "Burnaby" },
  { value: "Surrey", label: "Surrey" },
  { value: "Richmond", label: "Richmond" },
  { value: "North Vancouver", label: "North Vancouver" },
  { value: "West Vancouver", label: "West Vancouver" },
  { value: "New Westminster", label: "New Westminster" },
];

export default function Places() {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/places/list', selectedType, selectedNeighborhood, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedNeighborhood !== 'all') params.append('neighborhood', selectedNeighborhood);
      if (searchQuery) params.append('q', searchQuery);
      params.append('featured_first', '1');
      
      return fetch(`/api/places/list?${params}`).then(res => res.json());
    }
  });

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlace(null);
  };

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-bg text-text flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Unable to load places</h1>
            <p className="text-muted">Please try again later</p>
          </div>
        </div>
      </Layout>
    );
  }

  const featured = data?.featured;
  const places = data?.items || [];

  return (
    <Layout>
      <div className="min-h-screen bg-bg text-text">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-fraunces text-4xl md:text-5xl font-bold text-primary mb-4">
              South Asian Places in Vancouver
            </h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Restaurants, cafés, shops & cultural spots
            </p>
            <p className="text-lg text-muted/80 max-w-2xl mx-auto mt-2">
              Discover authentic South Asian experiences across the city
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            {/* Type Filters + Submit Link */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              <div className="flex flex-wrap justify-center gap-3">
                {typeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedType(filter.value)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${
                      selectedType === filter.value
                        ? "bg-primary text-black"
                        : "bg-white/10 text-text hover:bg-white/20"
                    }`}
                    data-testid={`filter-type-${filter.value}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Submit Link */}
              <div className="border-l border-white/20 pl-3 ml-3">
                <a
                  href="/places/submit"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium inline-flex items-center gap-1"
                  data-testid="link-submit-place"
                >
                  <Plus className="w-4 h-4" />
                  List your place
                </a>
              </div>
            </div>

            {/* Search and Neighborhood */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  type="text"
                  placeholder="Search places, cuisine, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-muted/70"
                  data-testid="input-search"
                />
              </div>
              
              <div className="w-full sm:w-48">
                <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-neighborhood">
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {neighborhoodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted mt-4">Loading places...</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && (
            <>
              {/* Featured Hero */}
              {featured && (
                <div className="mb-12">
                  <FeaturedHeroPlace 
                    place={featured} 
                    onViewDetails={() => handlePlaceClick(featured)}
                  />
                </div>
              )}

              {/* Results Grid */}
              {places.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      onClick={() => handlePlaceClick(place)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-white mb-2">No places found</h3>
                  <p className="text-muted mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <a
                    href="/places/submit"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add the first place
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Details Modal */}
        <DetailsModalPlace
          place={selectedPlace}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </Layout>
  );
}