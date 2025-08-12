import { ExternalLink, MapPin, Calendar, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatPriceLevel } from "@/lib/taxonomy";
import { formatDateBadge, formatTimeRange } from "@/lib/dates";

interface BaseFeaturedItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  sponsored: boolean;
  sponsored_until?: string;
}

interface FeaturedEvent extends BaseFeaturedItem {
  type: 'event';
  date: string;
  start_at?: string;
  is_all_day?: boolean | string;
  timezone?: string;
  venue: string;
  city: string;
  buyUrl?: string;
  eventbriteId?: string;
  ticketTailorId?: string;
  priceFrom?: string;
  category?: string;
}

interface FeaturedPlace extends BaseFeaturedItem {
  type: 'place';
  place_type: string;
  neighborhood?: string;
  city: string;
  website_url?: string;
  booking_url?: string;
  price_level?: number;
}

type FeaturedItem = FeaturedEvent | FeaturedPlace;

interface FeaturedHeroProps {
  item: FeaturedItem;
  onViewDetails: () => void;
}

const getTypeColor = (type: string) => {
  const colors = {
    // Event categories
    concert: "bg-purple-500/90",
    club: "bg-pink-500/90",
    comedy: "bg-orange-500/90", 
    festival: "bg-green-500/90",
    // Place types
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
  return colors[type.toLowerCase() as keyof typeof colors] || "bg-gray-500/90";
};

const getEventDateInfo = (item: FeaturedEvent) => {
  const dateString = item.start_at || item.date;
  const timezone = item.timezone || 'America/Vancouver';
  const allDay = typeof item.is_all_day === 'string' ? item.is_all_day === 'true' : Boolean(item.is_all_day);
  
  const badge = formatDateBadge(dateString, timezone, allDay);
  const timeRange = formatTimeRange(dateString, undefined, timezone, allDay);
  
  // Extract day and month for display
  try {
    const date = new Date(dateString);
    const day = new Intl.DateTimeFormat('en-US', { 
      day: 'numeric',
      timeZone: timezone 
    }).format(date);
    const month = new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      timeZone: timezone 
    }).format(date);
    
    return { badge, timeRange, day, month };
  } catch (error) {
    return { badge: 'TBA', timeRange: 'TBA', day: 'TBA', month: 'TBA' };
  }
};

export default function FeaturedHero({ item, onViewDetails }: FeaturedHeroProps) {
  const isSponsored = item.sponsored && (!item.sponsored_until || new Date(item.sponsored_until) > new Date());
  const eventDateInfo = item.type === 'event' ? getEventDateInfo(item) : null;
  
  const getPrimaryAction = () => {
    if (item.type === 'event') {
      return {
        url: item.buyUrl || (item.eventbriteId ? `https://eventbrite.com/e/${item.eventbriteId}` : null),
        text: 'Get Tickets'
      };
    } else {
      return {
        url: item.booking_url || item.website_url,
        text: item.booking_url ? 'Make Reservation' : 'Visit Website'
      };
    }
  };

  const primaryAction = getPrimaryAction();

  const handlePrimaryAction = () => {
    if (primaryAction.url) {
      window.open(primaryAction.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: item.image_url 
          ? `linear-gradient(135deg, rgba(180, 80, 13, 0.3) 0%, rgba(212, 105, 26, 0.2) 50%, rgba(184, 84, 13, 0.3) 100%), url(${item.image_url})`
          : 'linear-gradient(135deg, rgba(180, 80, 13, 0.4) 0%, rgba(212, 105, 26, 0.3) 50%, rgba(184, 84, 13, 0.4) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 0 40px rgba(180, 80, 13, 0.3)'
      }}
      onClick={onViewDetails}
      data-testid="featured-hero"
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 0 60px rgba(180, 80, 13, 0.4)',
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      {/* Copper glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-copper-500/20 via-transparent to-copper-900/20 transition-opacity group-hover:opacity-75"></div>
      
      {/* Content overlay */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
        {/* Top Row: Badges */}
        <div className="flex justify-between items-start">
          {/* Date/Type Badge */}
          {item.type === 'event' ? (
            eventDateInfo?.badge !== 'TBA' ? (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-white">
                <div className="text-center">
                  <div className="text-2xl font-bold leading-none">{eventDateInfo.day}</div>
                  <div className="text-sm opacity-90">{eventDateInfo.month}</div>
                </div>
              </div>
            ) : (
              <Badge 
                variant="secondary" 
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm px-3 py-2 font-medium"
              >
                TBA
              </Badge>
            )
          ) : (
            <Badge 
              variant="secondary" 
              className={`${getTypeColor(item.place_type)} text-white border-0 text-sm px-3 py-1 capitalize font-medium shadow-lg`}
            >
              {item.place_type}
            </Badge>
          )}

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
          {/* Item Details */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-fraunces font-bold text-white leading-tight">
              {item.name}
            </h1>
            
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 shrink-0" />
                <span className="text-lg">
                  {item.type === 'event' 
                    ? `${item.venue} • ${item.city}`
                    : `${item.neighborhood ? `${item.neighborhood} • ` : ''}${item.city}`
                  }
                </span>
              </div>

              {item.type === 'event' && eventDateInfo && eventDateInfo.timeRange !== 'TBA' && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 shrink-0" />
                  <span className="text-lg">{eventDateInfo.timeRange}</span>
                </div>
              )}

              {item.type === 'place' && item.price_level && (
                <div className="text-lg font-medium">
                  {formatPriceLevel(item.price_level)}
                </div>
              )}
            </div>

            {/* Price or perk */}
            {item.type === 'event' && item.priceFrom && (
              <div className="text-lg text-primary font-medium">
                From {item.priceFrom}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {primaryAction.url && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrimaryAction();
                }}
                className="bg-copper-500 hover:bg-copper-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-h-12"
                data-testid="button-primary-action"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                {primaryAction.text}
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}