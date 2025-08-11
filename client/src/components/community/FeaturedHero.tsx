import { Calendar, MapPin, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, formatEventTime } from "@/utils/dateFormatters";
import type { CommunityEvent } from "@shared/schema";

interface FeaturedHeroProps {
  event: CommunityEvent;
  onViewDetails: () => void;
}

function FeaturedHero({ event, onViewDetails }: FeaturedHeroProps) {
  const eventDate = new Date(event.start_at);
  const isAllDay = event.is_all_day || false;

  const handleGetTickets = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.tickets_url) {
      window.open(event.tickets_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'concert': return 'bg-purple-500/90 hover:bg-purple-600/90';
      case 'club': return 'bg-pink-500/90 hover:bg-pink-600/90';
      case 'comedy': return 'bg-yellow-500/90 hover:bg-yellow-600/90';
      case 'festival': return 'bg-green-500/90 hover:bg-green-600/90';
      default: return 'bg-blue-500/90 hover:bg-blue-600/90';
    }
  };

  return (
    <div 
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl hover:shadow-copper-500/20 transition-all duration-300"
      onClick={onViewDetails}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-copper-900 to-copper-700" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
        {/* Top Row: Date Badge & Category */}
        <div className="flex justify-between items-start">
          {/* Date Badge */}
          <div className="bg-white/95 backdrop-blur-sm text-black px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {formatEventDate(eventDate, event.timezone || 'America/Vancouver')}
                {!isAllDay && (
                  <span className="ml-1 text-xs opacity-70">
                    • {formatEventTime(eventDate, event.timezone || 'America/Vancouver')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Category Badge */}
          {event.category && (
            <Badge 
              variant="secondary" 
              className={`${getCategoryColor(event.category)} text-white border-0 text-sm px-3 py-1 capitalize font-medium shadow-lg`}
            >
              {event.category}
            </Badge>
          )}
        </div>

        {/* Bottom Content */}
        <div className="space-y-4">
          {/* Event Details */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {event.title}
            </h1>
            
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-5 h-5 shrink-0" />
              <span className="text-lg">
                {event.venue ? `${event.venue} • ${event.city}` : event.city}
              </span>
            </div>

            {event.price_from && (
              <div className="text-white/90 text-lg">
                From ${event.price_from}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {event.tickets_url && (
              <Button 
                onClick={handleGetTickets}
                className="bg-copper-500 hover:bg-copper-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-h-12"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Get Tickets
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 px-8 py-3 text-lg font-semibold min-h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeaturedHero;