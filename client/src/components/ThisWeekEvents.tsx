import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  date: string;
  start_at?: string;
  end_at?: string;
  is_all_day?: boolean | string;
  city: string;
  category?: string;
  buyUrl?: string;
  eventbriteId?: string;
  priceFrom?: string;
  image_url?: string;
  featured: boolean;
  tickets_url?: string;
}

interface EventsResponse {
  featured: CommunityEvent | null;
  items: CommunityEvent[];
  total: number;
}

export default function ThisWeekEvents() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Fetch this week's events
  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: ["community-events-week"],
    queryFn: async () => {
      const response = await fetch("/api/community/weekly?range=week");
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  });

  const events = data?.items || [];
  const hasEvents = events.length > 0;

  // Check scroll position for arrow visibility
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [events]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Width of one card + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Don't render section if no events
  if (!isLoading && !hasEvents) {
    return null;
  }

  const formatEventTime = (event: CommunityEvent) => {
    if (event.is_all_day === true || event.is_all_day === "true") {
      return "All Day";
    }
    if (event.start_at) {
      try {
        const time = format(parseISO(event.start_at), "h:mm a");
        return time;
      } catch {
        return event.start_at;
      }
    }
    return null;
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const getEventUrl = (event: CommunityEvent) => {
    return event.tickets_url || event.buyUrl || 
           (event.eventbriteId ? `https://www.eventbrite.com/e/${event.eventbriteId}` : null);
  };

  if (isLoading) {
    return (
      <section className="py-12 lg:py-16 relative bg-gradient-to-b from-transparent via-white/3 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-fraunces text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
              What's next? (7 day preview)
            </h2>
            <p className="text-muted">Loading events...</p>
          </div>
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-80 animate-pulse">
                <div className="bg-white/10 rounded-2xl h-96"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-16 relative bg-gradient-to-b from-transparent via-white/3 to-transparent overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="font-fraunces text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
                What's next? (7 day preview)
              </h2>
              <p className="text-muted">
                South Asian culture, music, and community events
              </p>
            </div>
            <Link href="/events">
              <Button
                variant="ghost"
                className="text-copper-400 hover:text-copper-300 hover:bg-white/5"
                data-testid="view-all-events"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="relative">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-all duration-200"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-all duration-200"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Events Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
          >
            {events.map((event, index) => {
              const eventUrl = getEventUrl(event);
              const eventTime = formatEventTime(event);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.3) }}
                  className="flex-shrink-0 w-80"
                >
                  <Card 
                    className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-copper-500/30 transition-all duration-300 overflow-hidden group cursor-pointer h-full"
                    onClick={() => {
                      if (eventUrl) {
                        window.open(eventUrl, '_blank');
                      }
                    }}
                  >
                    {/* Event Image */}
                    <div className="relative h-48 bg-gradient-to-b from-copper-500/10 to-copper-500/5 overflow-hidden">
                      {event.image_url ? (
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Calendar className="w-12 h-12 text-copper-400/30 mx-auto mb-2" />
                            <span className="text-xs text-muted">{event.category || 'Event'}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Date Badge */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[60px]">
                        <div className="text-xl font-bold text-white">
                          {(() => {
                            try {
                              const date = parseISO(event.start_at || event.date);
                              return format(date, "d");
                            } catch {
                              return "TBA";
                            }
                          })()}
                        </div>
                        <div className="text-xs font-semibold text-copper-400 uppercase">
                          {(() => {
                            try {
                              const date = parseISO(event.start_at || event.date);
                              return format(date, "MMM");
                            } catch {
                              return "";
                            }
                          })()}
                        </div>
                      </div>
                      
                      {/* Featured Badge */}
                      {event.featured && (
                        <div className="absolute top-3 right-3 bg-copper-500 text-black text-xs font-bold px-2 py-1 rounded">
                          FEATURED
                        </div>
                      )}
                    </div>
                    
                    {/* Event Details */}
                    <div className="p-5">
                      <h3 className="font-semibold text-white mb-3 line-clamp-2 group-hover:text-copper-400 transition-colors min-h-[48px]">
                        {event.title}
                      </h3>
                      
                      <div className="space-y-2 text-sm">
                        {event.venue && (
                          <div className="flex items-start gap-2 text-muted">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{event.venue}</span>
                          </div>
                        )}
                        
                        {eventTime && (
                          <div className="flex items-center gap-2 text-muted">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>{eventTime}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Price and Category */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        {event.priceFrom ? (
                          <span className="text-copper-400 font-medium">
                            From ${event.priceFrom}
                          </span>
                        ) : (
                          <span className="text-muted text-sm">
                            {event.category || 'Community Event'}
                          </span>
                        )}
                        
                        {eventUrl && (
                          <span className="text-copper-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}