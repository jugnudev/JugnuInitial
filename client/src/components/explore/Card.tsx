import { ExternalLink, MapPin, Calendar, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import FavoriteButton from "@/components/FavoriteButton";
import { formatPriceLevel } from "@/lib/taxonomy";
import { formatDateBadge, isValidISO } from "@/lib/dates";

interface BaseItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  sponsored: boolean;
  sponsored_until?: string;
}

interface EventItem extends BaseItem {
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

interface PlaceItem extends BaseItem {
  type: 'place';
  place_type: string;
  neighborhood?: string;
  city: string;
  website_url?: string;
  booking_url?: string;
  price_level?: number;
}

type CardItem = EventItem | PlaceItem;

interface CardProps {
  item: CardItem;
  onClick: () => void;
  index?: number;
  showFavorite?: boolean;
}

const getTypeColor = (type?: string) => {
  if (!type) return "bg-gray-500/90";
  
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

const getDateBadgeInfo = (eventItem: EventItem) => {
  // Use start_at if available (newer data structure), fallback to date
  const dateString = eventItem.start_at || eventItem.date;
  const timezone = eventItem.timezone || 'America/Vancouver';
  const allDay = typeof eventItem.is_all_day === 'string' ? eventItem.is_all_day === 'true' : Boolean(eventItem.is_all_day);
  
  const badge = formatDateBadge(dateString, timezone, allDay);
  
  if (badge === 'TBA') {
    return { shouldShow: false, content: null };
  }
  
  // Extract day and month for the compact badge display
  if (!isValidISO(dateString)) {
    return { shouldShow: false, content: null };
  }
  
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
    
    return { 
      shouldShow: true, 
      content: { day, month, fullBadge: badge }
    };
  } catch (error) {
    return { shouldShow: false, content: null };
  }
};

export default function Card({ item, onClick, index = 0, showFavorite = false }: CardProps) {
  const isSponsored = item.sponsored && (!item.sponsored_until || new Date(item.sponsored_until) > new Date());
  
  // Get date info for events
  const dateInfo = item.type === 'event' ? getDateBadgeInfo(item) : null;

  const getPrimaryAction = () => {
    if (item.type === 'event') {
      return {
        url: item.buyUrl || (item.eventbriteId ? `https://eventbrite.com/e/${item.eventbriteId}` : null),
        text: 'Get Tickets'
      };
    } else {
      return {
        url: item.booking_url || item.website_url,
        text: item.booking_url ? 'Book' : 'Website'
      };
    }
  };

  const primaryAction = getPrimaryAction();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: "easeOut" 
      }}
      className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer ring-1 ring-white/5 hover:ring-amber-500/25 hover:shadow-[0_0_0_1px_theme(colors.amber.500/25)] transition-all duration-300"
      onClick={onClick}
      data-testid={`card-${item.type}-${item.id}`}
      whileHover={{ 
        y: -2,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      {/* 16:9 Image Container */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
            <Star className="w-12 h-12 text-[#c05a0e]/80" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {/* Favorite Button */}
          {showFavorite && (
            <div className="absolute -top-1 -right-1">
              <FavoriteButton
                id={item.id}
                type={item.type}
                name={item.name}
                size="md"
                variant="ghost"
              />
            </div>
          )}
          {/* Date/Type Badge */}
          {item.type === 'event' ? (
            dateInfo?.shouldShow ? (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-2 text-white text-center min-w-[50px]">
                <div className="text-lg font-bold leading-none">{dateInfo.content!.day}</div>
                <div className="text-xs opacity-90">{dateInfo.content!.month}</div>
              </div>
            ) : (
              <Badge 
                variant="secondary" 
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs px-2 py-1 font-medium"
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
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <h3 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-2">
            {item.name}
          </h3>
          
          <div className="flex items-center gap-2 text-white/90 mb-3">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="text-sm truncate">
              {item.type === 'event' 
                ? `${item.venue} • ${item.city}`
                : `${item.neighborhood ? `${item.neighborhood} • ` : ''}${item.city}`
              }
            </span>
            
            {item.type === 'place' && item.price_level && (
              <>
                <span className="text-white/60">•</span>
                <span className="text-sm font-medium">
                  {formatPriceLevel(item.price_level)}
                </span>
              </>
            )}
          </div>

          {/* Action CTA */}
          {primaryAction.url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (primaryAction.url) {
                  window.open(primaryAction.url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-black text-sm rounded-lg hover:bg-primary/90 transition-colors font-medium"
              data-testid={`button-primary-${item.type}-${item.id}`}
            >
              <ExternalLink className="w-3 h-3" />
              {primaryAction.text}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}