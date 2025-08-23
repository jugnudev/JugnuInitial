import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Share2, 
  X,
  Copy 
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { getCalendarLinks } from "@/lib/calendar";
import { formatEventDate, formatEventTime } from "@/utils/dateFormatters";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  start_at: string;
  end_at?: string;
  timezone: string;
  is_all_day?: boolean;
  venue?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  organizer?: string;
  tickets_url?: string;
  source_url?: string;
  image_url?: string;
  price_from?: string;
  tags?: string[];
  status: string;
}

interface EventModalProps {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({ event, isOpen, onClose }: EventModalProps) {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });

  if (!event) return null;

  const handleAddToCalendar = (type: 'google' | 'ics') => {
    try {
      const startDate = new Date(event.start_at);
      if (isNaN(startDate.getTime())) {
        alert("Invalid event date");
        return;
      }
      
      const endDate = event.end_at ? new Date(event.end_at) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      if (isNaN(endDate.getTime())) {
        alert("Invalid event end date");
        return;
      }
      
      const { google, ics } = getCalendarLinks({
        title: event.title,
        startISO: startDate.toISOString(),
        endISO: endDate.toISOString(),
        location: [event.venue, event.address, event.city].filter(Boolean).join(", "),
        description: event.organizer ? `Organized by ${event.organizer}` : "",
      });

      if (type === 'google') {
        window.open(google, '_blank');
      } else {
        // Download ICS file
        const link = document.createElement('a');
        link.href = ics;
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        link.click();
      }
    } catch (error) {
      console.error("Error adding to calendar:", error);
      alert("Error adding event to calendar");
    }
  };

  const openInMaps = () => {
    const query = encodeURIComponent([event.venue, event.address, event.city].filter(Boolean).join(", "));
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleShare = async (e: React.MouseEvent) => {
    // Create deep link with event ID
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLink = `${baseUrl}?e=${event.id}`;
    
    const shareData = {
      title: event.title,
      text: `${event.title} — ${event.venue || event.city}`,
      url: deepLink,
    };

    // Get cursor position for toast placement
    const rect = e.currentTarget.getBoundingClientRect();
    setToastPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy deep link to clipboard and show toast
        await navigator.clipboard.writeText(deepLink);
        showToast();
      }
    } catch (error) {
      // Final fallback: copy to clipboard and show toast
      try {
        await navigator.clipboard.writeText(deepLink);
        showToast();
      } catch (clipboardError) {
        console.error('Share failed:', error, clipboardError);
        // Even for errors, try to show a helpful toast instead of alert
        showToast('Unable to copy link');
      }
    }
  };

  const showToast = (message = 'Link copied to clipboard!') => {
    setShowCopiedToast(true);
    setTimeout(() => {
      setShowCopiedToast(false);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-neutral-900/95 backdrop-blur-xl border border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid lg:grid-cols-12 gap-0"
        >
          {/* Media Pane - Left Side on Desktop */}
          <div className="lg:col-span-7">
            <div className="relative w-full bg-black/40 rounded-t-2xl lg:rounded-tl-2xl lg:rounded-tr-none lg:rounded-bl-2xl overflow-hidden">
              {/* 16:9 wrapper without plugin: padding-bottom trick */}
              <div className="relative pb-[56.25%]">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/20 flex items-center justify-center">
                    <CalendarDays className="h-20 w-20 text-amber-500/50" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Pane - Right Side on Desktop */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
              {/* Header with Title and Close Button */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 
                  id="event-title" 
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
                >
                  {event.title}
                </h1>
                <DialogClose asChild>
                  <button 
                    aria-label="Close" 
                    className="rounded-full p-2 hover:bg-white/10 transition-colors"
                    data-testid="button-close-modal"
                  >
                    <X className="h-5 w-5 text-white/70" />
                  </button>
                </DialogClose>
              </div>

              {/* Category Badge */}
              {event.category && (
                <div className="mb-6">
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
                    {event.category}
                  </Badge>
                </div>
              )}

              {/* Event Details */}
              <div className="space-y-5 text-sm leading-6 text-white/90">
                {/* Date and Time */}
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 opacity-70 mt-0.5 text-amber-400" />
                  <div>
                    <div className="font-medium text-white">
                      {formatEventDate(event.start_at, event.timezone)}
                    </div>
                    <div className="flex items-center gap-2 opacity-80">
                      <Clock className="h-4 w-4" />
                      <span>{formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {event.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 opacity-70 mt-0.5 text-amber-400" />
                    <div>
                      <div className="font-medium text-white">{event.venue}</div>
                      <div className="opacity-80">
                        {event.city}
                        {event.address ? `, ${event.address}` : ""}
                      </div>
                      <motion.a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openInMaps();
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 mt-1 transition-colors"
                        data-testid="button-open-maps"
                      >
                        Open in Maps <ExternalLink className="h-3.5 w-3.5" />
                      </motion.a>
                    </div>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div className="pt-4">
                    <h3 className="font-semibold text-white mb-2">About this event</h3>
                    <p className="text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Helper Text */}
              <div className="mt-8 pt-6 border-t border-white/10 text-sm">
                <span className="opacity-60">Don't see your event? </span>
                <a 
                  href="/community/feature" 
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                  data-testid="link-organizer-feature"
                >
                  Request to have it listed
                </a>
              </div>
            </div>

            {/* Actions Bar - Sticky at Bottom */}
            <div className="px-6 sm:px-8 py-5 bg-black/30 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="secondary" 
                    onClick={handleShare} 
                    className="gap-2 bg-white/10 hover:bg-white/20 border-white/20"
                    data-testid="button-share"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </motion.div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => handleAddToCalendar('google')} 
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                    data-testid="button-add-google"
                  >
                    Add to Google
                  </Button>
                </motion.div>
                
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => handleAddToCalendar('ics')} 
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                    data-testid="button-download-ics"
                  >
                    Download .ics
                  </Button>
                </motion.div>
                
                {event.tickets_url && (
                  <motion.a 
                    href={event.tickets_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-get-tickets"
                  >
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      Get Tickets
                    </Button>
                  </motion.a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>

      {/* Toast notification for copied link */}
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
    </Dialog>
  );
}