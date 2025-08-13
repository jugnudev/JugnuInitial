import { ExternalLink, MapPin, Instagram, Globe, Star } from "lucide-react";
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
  featured?: boolean;
  lat?: number;
  lng?: number;
  rating?: number;
  rating_count?: number;
  // Places Sync v1.2 additions
  country?: string;
  google_photo_ref?: string;
  photo_source?: string;
  business_status?: string;
}

interface PlaceCardProps {
  place: Place;
  onClick: () => void;
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

export default function PlaceCard({ place, onClick }: PlaceCardProps) {
  const isSponsored = place.sponsored && (!place.sponsored_until || new Date(place.sponsored_until) > new Date());

  return (
    <div 
      className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-xl transition-all duration-300"
      onClick={onClick}
      data-testid={`place-card-${place.id}`}
    >
      {/* 16:9 Image Container */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {place.image_url ? (
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : place.google_photo_ref ? (
          <img
            src={`/api/images/google-photo?ref=${place.google_photo_ref}&w=800`}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              // Fallback to placeholder if Google photo fails to load
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.google-photo-fallback') as HTMLElement;
              if (fallback) {
                fallback.classList.remove('hidden');
              }
            }}
          />
        ) : null}
        {!place.image_url && !place.google_photo_ref && (
          <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
            <Star className="w-12 h-12 text-[#c05a0e]/80" />
          </div>
        )}
        {place.google_photo_ref && !place.image_url && (
          <div className="google-photo-fallback hidden w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
            <Star className="w-12 h-12 text-[#c05a0e]/80" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <Badge 
            variant="secondary" 
            className={`${getTypeColor(place.type)} text-white border-0 text-sm px-3 py-1 capitalize font-medium shadow-lg`}
          >
            {place.type}
          </Badge>
          
          {isSponsored && (
            <Badge 
              variant="secondary" 
              className="bg-yellow-500/90 text-black border-0 text-sm px-3 py-1 font-medium shadow-lg"
            >
              Sponsored
            </Badge>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white leading-tight mb-1">
            {place.name}
          </h3>
          <div className="flex items-center gap-2 text-white/90 mb-3">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="text-sm">
              {place.neighborhood ? `${place.neighborhood} • ${place.city}` : place.city}
            </span>
            {place.price_level && (
              <>
                <span className="text-white/60">•</span>
                <span className="text-sm font-medium">
                  {renderPriceLevel(place.price_level)}
                </span>
              </>
            )}
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            {place.website_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(place.website_url, '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                data-testid={`button-website-${place.id}`}
              >
                <Globe className="w-3 h-3" />
                Website
              </button>
            )}
            
            {place.booking_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(place.booking_url, '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/80 text-black text-sm rounded-lg hover:bg-primary transition-colors font-medium"
                data-testid={`button-booking-${place.id}`}
              >
                <ExternalLink className="w-3 h-3" />
                Book
              </button>
            )}
            
            {place.instagram && (
              <button
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
                className="inline-flex items-center justify-center w-8 h-8 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors"
                data-testid={`button-instagram-${place.id}`}
              >
                <Instagram className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}