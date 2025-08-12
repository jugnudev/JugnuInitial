import { useEffect, useState } from "react";
import { X, ExternalLink, MapPin, Globe, Instagram, Share2, Copy, ChevronDown, ChevronUp, Star, Phone, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  sponsored: boolean;
  sponsored_until?: string;
}

interface DetailsModalPlaceProps {
  place: Place | null;
  isOpen: boolean;
  onClose: () => void;
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

export default function DetailsModalPlace({ place, isOpen, onClose }: DetailsModalPlaceProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen || !place) return null;

  const isSponsored = place.sponsored && (!place.sponsored_until || new Date(place.sponsored_until) > new Date());
  
  // Parse description into paragraphs and check if it needs "Show more"
  const descriptionParagraphs = place.description 
    ? place.description.split('\n\n').filter(p => p.trim().length > 0)
    : [];
  
  const descriptionLines = place.description ? place.description.split('\n').length : 0;
  const needsShowMore = descriptionLines > 6;

  const openInMaps = () => {
    const query = place.address ? `${place.name}, ${place.address}` : place.name;
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://maps.google.com/?q=${encodedQuery}`, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: place.name,
      text: `Check out ${place.name} - ${place.type} in ${place.neighborhood || place.city}`,
      url: window.location.href
    };

    // Get cursor position for toast placement
    const rect = e.currentTarget.getBoundingClientRect();
    setToastPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      }
    } catch (error) {
      // Silent fail for share cancellation
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Mobile: Full screen sheet */}
      <div className="md:hidden h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-bg">
          <h2 className="text-lg font-semibold text-white truncate">{place.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
            aria-label="Close modal"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-bg">
          {/* Image */}
          <div className="relative w-full aspect-[16/9]">
            {place.image_url ? (
              <img
                src={place.image_url}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
                <Star className="w-16 h-16 text-[#c05a0e]/80" />
              </div>
            )}
            
            {/* Badges overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
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
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Title & Price */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{place.name}</h1>
              {place.price_level && (
                <div className="text-lg text-primary font-medium">
                  {renderPriceLevel(place.price_level)}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-white font-medium">
                  {place.neighborhood ? `${place.neighborhood} • ${place.city}` : place.city}
                </p>
                {place.address && (
                  <p className="text-muted text-sm mt-1">{place.address}</p>
                )}
                {(place.address || place.name) && (
                  <button
                    onClick={openInMaps}
                    className="text-primary hover:text-primary/80 text-sm mt-1 inline-flex items-center gap-1"
                    data-testid="button-open-maps"
                  >
                    Open in Maps <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Phone */}
            {place.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <a 
                  href={`tel:${place.phone}`}
                  className="text-white hover:text-primary transition-colors"
                >
                  {place.phone}
                </a>
              </div>
            )}

            {/* Description */}
            {descriptionParagraphs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-medium text-lg">About</h3>
                <div 
                  className={`text-muted space-y-2 ${
                    needsShowMore && !isDescriptionExpanded ? 'line-clamp-6' : ''
                  }`}
                >
                  {descriptionParagraphs.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {needsShowMore && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                    {isDescriptionExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Tags */}
            {place.tags && place.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-medium text-lg">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/10 text-white text-sm rounded-full capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="space-y-3">
              <h3 className="text-white font-medium text-lg">Links</h3>
              <div className="flex flex-wrap gap-3">
                {place.website_url && (
                  <a
                    href={place.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    data-testid="button-website"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                
                {place.booking_url && (
                  <a
                    href={place.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-copper-500 text-white font-medium rounded-lg hover:bg-copper-600 transition-colors"
                    data-testid="button-booking"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Reserve
                  </a>
                )}
                
                {place.instagram && (
                  <a
                    href={place.instagram.startsWith('http') ? place.instagram : `https://instagram.com/${place.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 transition-colors"
                    data-testid="button-instagram"
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Delivery Apps */}
            {place.delivery_urls && Object.keys(place.delivery_urls).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-medium text-lg">Delivery</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(place.delivery_urls).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors capitalize"
                    >
                      <Utensils className="w-4 h-4" />
                      {platform.replace(/([A-Z])/g, ' $1').trim()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="p-4 bg-bg border-t border-white/10">
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="p-3 border border-primary/50 text-primary rounded-xl hover:bg-primary/10 transition-colors"
              aria-label="Share place"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            <div className="flex-1">
              {place.booking_url ? (
                <a
                  href={place.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Make Reservation
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              ) : place.website_url ? (
                <a
                  href={place.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Visit Website
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              ) : (
                <div className="w-full inline-flex items-center justify-center px-6 py-3 bg-white/10 text-muted font-medium rounded-xl cursor-not-allowed">
                  No website available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Centered dialog */}
      <div className="hidden md:flex items-center justify-center p-4 h-full">
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-bg border border-white/10 rounded-2xl overflow-hidden flex">
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Close modal"
              data-testid="button-close-modal-desktop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left: Image */}
          <div className="w-1/2 relative">
            {place.image_url ? (
              <img
                src={place.image_url}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
                <Star className="w-20 h-20 text-[#c05a0e]/80" />
              </div>
            )}
          </div>

          {/* Right: Content */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
              <div className="space-y-6">
                {/* Title & badges */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h1 className="font-fraunces text-3xl font-bold text-white leading-tight pr-4">
                      {place.name}
                    </h1>
                    {place.price_level && (
                      <div className="text-primary text-xl font-semibold shrink-0">
                        {renderPriceLevel(place.price_level)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <Badge 
                      variant="secondary" 
                      className={`${getTypeColor(place.type)} text-white border-0 text-sm px-3 py-1 capitalize font-medium`}
                    >
                      {place.type}
                    </Badge>
                    {isSponsored && (
                      <Badge 
                        variant="secondary" 
                        className="bg-yellow-500/90 text-black border-0 text-sm px-3 py-1 font-medium"
                      >
                        Sponsored
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {place.neighborhood ? `${place.neighborhood} • ${place.city}` : place.city}
                    </p>
                    {place.address && (
                      <p className="text-muted text-sm mt-1">{place.address}</p>
                    )}
                    {(place.address || place.name) && (
                      <button
                        onClick={openInMaps}
                        className="text-primary hover:text-primary/80 text-sm mt-1 inline-flex items-center gap-1"
                        data-testid="button-open-maps-desktop"
                      >
                        Open in Maps <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                {place.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <a 
                      href={`tel:${place.phone}`}
                      className="text-white hover:text-primary transition-colors"
                    >
                      {place.phone}
                    </a>
                  </div>
                )}

                {/* Description */}
                {descriptionParagraphs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-medium text-lg">About</h3>
                    <div 
                      className={`text-muted space-y-2 ${
                        needsShowMore && !isDescriptionExpanded ? 'line-clamp-6' : ''
                      }`}
                    >
                      {descriptionParagraphs.map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-line">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {needsShowMore && (
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        {isDescriptionExpanded ? 'Show less' : 'Show more'}
                        {isDescriptionExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Tags */}
                {place.tags && place.tags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-medium text-lg">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {place.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white/10 text-white text-sm rounded-full capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky bottom bar */}
            <div className="p-6 bg-bg border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={handleShare}
                  className="p-3 border border-primary/50 text-primary rounded-xl hover:bg-primary/10 transition-colors"
                  aria-label="Share place"
                  data-testid="button-share-desktop"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                
                <div className="flex-1 flex gap-3">
                  {place.booking_url && (
                    <a
                      href={place.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-copper-500 text-white font-medium rounded-xl hover:bg-copper-600 transition-colors"
                    >
                      Reserve
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  )}
                  
                  {place.website_url && (
                    <a
                      href={place.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Website
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  )}
                  
                  {place.instagram && (
                    <a
                      href={place.instagram.startsWith('http') ? place.instagram : `https://instagram.com/${place.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Delivery apps row */}
              {place.delivery_urls && Object.keys(place.delivery_urls).length > 0 && (
                <div className="flex gap-2 text-sm">
                  {Object.entries(place.delivery_urls).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors capitalize"
                    >
                      <Utensils className="w-3 h-3" />
                      {platform.replace(/([A-Z])/g, ' $1').trim()}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showCopiedToast && (
        <div
          className="fixed z-[60] px-3 py-2 bg-black/90 text-white text-sm rounded-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-200 ease-out"
          style={{
            left: `${toastPosition.x}px`,
            top: `${toastPosition.y}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3 h-3" />
            Link copied to clipboard!
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
        </div>
      )}
    </div>
  );
}