import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
}

interface EventsResponse {
  featured: CommunityEvent | null;
  items: CommunityEvent[];
  total: number;
}

export default function ThisWeekEvents() {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  });

  const events = data?.items || [];
  const hasEvents = events.length > 0;

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
      return {
        day: format(date, "d"),
        month: format(date, "MMM").toUpperCase(),
        weekday: format(date, "EEEE")
      };
    } catch {
      return {
        day: "?",
        month: "---",
        weekday: "---"
      };
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 lg:py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-fraunces text-3xl lg:text-4xl font-bold tracking-tight text-white mb-4">
              This Week in Vancouver
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Loading events...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/10 rounded-2xl h-48"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-copper-500/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-fraunces text-3xl lg:text-4xl font-bold tracking-tight text-white mb-4">
            This Week in Vancouver
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            South Asian culture, music, and community events happening now
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {events.slice(0, 6).map((event, index) => {
            const dateInfo = formatEventDate(event.date);
            const eventTime = formatEventTime(event);
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-copper-500/30 transition-all duration-300 overflow-hidden group cursor-pointer h-full">
                  <div 
                    className="p-6 flex gap-4 h-full"
                    onClick={() => {
                      if (event.buyUrl) {
                        window.open(event.buyUrl, '_blank');
                      } else if (event.eventbriteId) {
                        window.open(`https://www.eventbrite.com/e/${event.eventbriteId}`, '_blank');
                      }
                    }}
                  >
                    {/* Date Badge */}
                    <div className="flex-shrink-0">
                      <div className="bg-copper-500/10 border border-copper-500/30 rounded-lg p-3 text-center min-w-[70px]">
                        <div className="text-2xl font-bold text-copper-500">{dateInfo.day}</div>
                        <div className="text-xs text-copper-400 uppercase">{dateInfo.month}</div>
                      </div>
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-copper-400 transition-colors">
                        {event.title}
                      </h3>
                      
                      {event.venue && (
                        <div className="flex items-center gap-1.5 text-sm text-muted mb-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      )}
                      
                      {eventTime && (
                        <div className="flex items-center gap-1.5 text-sm text-muted mb-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{eventTime}</span>
                        </div>
                      )}
                      
                      {event.priceFrom && (
                        <div className="text-sm font-medium text-copper-400 mt-2">
                          From ${event.priceFrom}
                        </div>
                      )}
                      
                      {event.category && (
                        <span className="inline-block mt-2 px-2 py-1 bg-white/5 text-xs text-muted rounded-full">
                          {event.category}
                        </span>
                      )}
                    </div>
                    
                    {/* Arrow indicator for clickable */}
                    {(event.buyUrl || event.eventbriteId) && (
                      <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-copper-400" />
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link href="/explore">
            <Button
              size="lg"
              className="bg-white/10 hover:bg-copper-500 hover:text-black text-white border border-white/20 transition-all duration-200"
              data-testid="view-all-events"
            >
              View All Events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}