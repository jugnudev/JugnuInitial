import { ExternalLink, MapPin, Instagram, Globe, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Place {
  id: string;
  name: string;
  type: string;
  description?: string;
  neighborhood?: string;
  address?: string;
  city: string;
  website_url?: string;
  booking_url?: string;
  instagram?: string;
  price_level?: number;
  tags?: string[];
  image_url?: string;
  sponsored: boolean;
  sponsored_until?: string;
}

interface FeaturedHeroPlaceProps {
  place: Place;
  onViewDetails: () => void;
}

const getTypeColor = (type: string) => {
  const colors = {
    restaurant: "bg-orange-500/90",
    cafe: "bg-amber-500/90", 
    dessert: "bg-pink-500/90",
    grocer: "bg-green-500/90",
    fashion: "bg-purple-500/90",
    beauty: "bg-rose-500/90",
    dance: "bg-blue-500/90",
    temple: "bg-yellow-500/90",
    gurdwara: "bg-orange-600/90",
    mosque: "bg-emerald-500/90",
    gallery: "bg-indigo-500/90",
    org: "bg-gray-500/90"
  };
  return colors[type as keyof typeof colors] || "bg-gray-500/90";
};

const renderPriceLevel = (level?: number) => {
  if (!level) return null;
  return "₹".repeat(level);
};

export default function FeaturedHeroPlace({ place, onViewDetails }: FeaturedHeroPlaceProps) {
  const primaryUrl = place.booking_url || place.website_url;
  const isSponsored = place.sponsored && (!place.sponsored_until || new Date(place.sponsored_until) > new Date());

  const handlePrimaryAction = () => {
    if (primaryUrl) {
      window.open(primaryUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer group shadow-2xl"
      style={{
        background: place.image_url 
          ? `linear-gradient(135deg, rgba(180, 80, 13, 0.3) 0%, rgba(212, 105, 26, 0.2) 50%, rgba(184, 84, 13, 0.3) 100%), url(${place.image_url})`
          : 'linear-gradient(135deg, rgba(180, 80, 13, 0.4) 0%, rgba(212, 105, 26, 0.3) 50%, rgba(184, 84, 13, 0.4) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 0 40px rgba(180, 80, 13, 0.3)'
      }}
      onClick={onViewDetails}
      data-testid="featured-hero-place"
    >
      {/* Copper glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-copper-500/20 via-transparent to-copper-900/20 transition-opacity group-hover:opacity-75"></div>
      
      {/* Content overlay */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
        {/* Top Row: Badges */}
        <div className="flex justify-between items-start">
          {/* Type Badge */}
          <Badge 
            variant="secondary" 
            className={`${getTypeColor(place.type)} text-white border-0 text-sm px-3 py-1 capitalize font-medium shadow-lg`}
          >
            {place.type}
          </Badge>

          {/* Right side badges */}
          <div className="flex gap-2">
            {/* Featured Badge */}
            <Badge 
              variant="secondary" 
              className="bg-copper-500/90 text-white border-0 text-sm px-3 py-1 font-medium shadow-lg"
            >
              Featured
            </Badge>
            
            {/* Sponsored Badge */}
            {isSponsored && (
              <Badge 
                variant="secondary" 
                className="bg-yellow-500/90 text-black border-0 text-sm px-3 py-1 font-medium shadow-lg"
              >
                Sponsored
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom Content */}
        <div className="space-y-4">
          {/* Place Details */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {place.name}
            </h1>
            
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 shrink-0" />
                <span className="text-lg">
                  {place.neighborhood ? `${place.neighborhood} • ${place.city}` : place.city}
                </span>
              </div>

              {place.price_level && (
                <div className="text-lg font-medium">
                  {renderPriceLevel(place.price_level)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {primaryUrl && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrimaryAction();
                }}
                className="bg-copper-500 hover:bg-copper-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-h-12"
                data-testid="button-primary-action"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                {place.booking_url ? 'Make Reservation' : 'Visit Website'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 px-8 py-3 text-lg font-semibold min-h-12"
              data-testid="button-view-details"
            >
              View Details
            </Button>

            {place.instagram && (
              <Button 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    place.instagram!.startsWith('http') 
                      ? place.instagram 
                      : `https://instagram.com/${place.instagram.replace('@', '')}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 px-4 py-3 min-h-12"
                data-testid="button-instagram"
              >
                <Instagram className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}