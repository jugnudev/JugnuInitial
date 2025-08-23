import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Share2, 
  Copy, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

interface DetailsModalProps {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EventInfoProps {
  event: CommunityEvent;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (expanded: boolean) => void;
  descriptionParagraphs: string[];
  needsShowMore: boolean;
  openInMaps: () => void;
}

// Reusable EventInfo component for both desktop and mobile
function EventInfo({ 
  event, 
  isDescriptionExpanded, 
  setIsDescriptionExpanded, 
  descriptionParagraphs, 
  needsShowMore, 
  openInMaps 
}: EventInfoProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3">
          {event.title}
        </h1>
        {/* Category chip */}
        {event.category && (
          <Badge className="bg-white/10 text-white border-0 hover:bg-white/15">
            {event.category}
          </Badge>
        )}
      </div>

      {/* Date row */}
      <div className="flex items-start gap-3">
        <CalendarDays className="w-5 h-5 text-amber-500 mt-1" aria-hidden="true" />
        <div>
          <p className="text-white font-medium">
            {formatEventDate(event.start_at, event.timezone)}
          </p>
        </div>
      </div>

      {/* Time row (single row only) */}
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-500 mt-1" aria-hidden="true" />
        <div>
          <p className="text-white font-medium">
            {formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}
          </p>
        </div>
      </div>

      {/* Venue line */}
      {event.venue && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-500 mt-1" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-white font-medium">{event.venue}</p>
            {/* City line */}
            <p className="text-white/70 text-sm">{event.city}</p>
            {/* Full street address (on its own line if present) */}
            {event.address && (
              <p className="text-white/70 text-sm">{event.address}</p>
            )}
            {/* Open in Maps link */}
            <button
              onClick={openInMaps}
              className="text-amber-500 hover:text-amber-400 text-sm inline-flex items-center gap-1 underline decoration-transparent hover:decoration-current transition-colors mt-1"
              data-testid="button-open-maps"
            >
              Open in Maps <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      {descriptionParagraphs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-lg">About this event</h3>
          <div 
            className={`text-white/80 space-y-2 leading-relaxed ${
              needsShowMore && !isDescriptionExpanded ? 'line-clamp-8' : ''
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
              className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
            >
              {isDescriptionExpanded ? 'Show less' : 'Show more'}
              {isDescriptionExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/10 my-6" />

      {/* Helper copy row */}
      <div>
        <p className="text-sm text-white/70">
          Don't see your event?{' '}
          <a 
            href="/community/feature" 
            className="text-amber-500 hover:text-amber-400 transition-colors underline decoration-transparent hover:decoration-current"
            data-testid="link-organizer-feature"
          >
            Request to have it listed
          </a>
        </p>
      </div>
    </div>
  );
}

export default function DetailsModal({ event, isOpen, onClose }: DetailsModalProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });

  // Parse description into paragraphs and check if it needs "Show more"
  const descriptionParagraphs = event?.description 
    ? event.description.split('\n\n').filter(p => p.trim().length > 0)
    : [];
  
  const descriptionLines = event?.description ? event.description.split('\n').length : 0;
  const needsShowMore = descriptionLines > 8;

  const handleAddToCalendar = (type: 'google' | 'ics') => {
    if (!event) return;
    
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
    if (!event) return;
    const query = encodeURIComponent([event.venue, event.address, event.city].filter(Boolean).join(", "));
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleShare = async (e: React.MouseEvent) => {
    if (!event) return;
    
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

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-[min(95vw,1120px)] max-h-[90vh] p-0 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/85 backdrop-blur-sm"
      >
        <DialogTitle className="sr-only" id={`modal-title-${event.id}`}>
          {event.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Event details for {event.title}
        </DialogDescription>

        <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="min-h-0"
          >
            {/* 16:9 Hero Image */}
            <div className="mx-6 mt-6">
              <div
                className="w-full rounded-2xl overflow-hidden ring-1 ring-white/10 bg-neutral-900 mx-auto max-h-[42vh] lg:max-h-[50vh]"
                style={{ aspectRatio: '16 / 9' }}
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-amber-700/15 flex items-center justify-center">
                    <CalendarDays className="w-16 h-16 text-amber-500/80" />
                  </div>
                )}
                {/* Subtle gradient for readability */}
                <div className="pointer-events-none relative -mt-[28%] h-[28%] bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            </div>

          {/* Content Section */}
          <div className="px-6 pb-6">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 mt-8">
              {/* Left Column: EventInfo (2fr) */}
              <div>
                <EventInfo 
                  event={event}
                  isDescriptionExpanded={isDescriptionExpanded}
                  setIsDescriptionExpanded={setIsDescriptionExpanded}
                  descriptionParagraphs={descriptionParagraphs}
                  needsShowMore={needsShowMore}
                  openInMaps={openInMaps}
                />
              </div>

              {/* Right Column: Action Card (1fr) */}
              <div>
                <div className="rounded-2xl p-5 bg-white/5 ring-1 ring-white/10 space-y-3">
                  {/* Primary Action */}
                  {event.tickets_url ? (
                    <motion.a
                      href={event.tickets_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition-colors"
                      data-testid="button-get-tickets"
                      whileTap={{ scale: 0.98 }}
                    >
                      Get Tickets
                      <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                    </motion.a>
                  ) : (
                    <div className="w-full inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white/50 font-semibold rounded-xl cursor-not-allowed">
                      No tickets available
                    </div>
                  )}

                  {/* Secondary Actions */}
                  <motion.button
                    onClick={() => handleAddToCalendar('google')}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
                    data-testid="button-add-google"
                    whileTap={{ scale: 0.98 }}
                  >
                    Add to Google
                  </motion.button>

                  <motion.button
                    onClick={() => handleAddToCalendar('ics')}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
                    data-testid="button-download-ics"
                    whileTap={{ scale: 0.98 }}
                  >
                    Download .ics
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-white/70 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
                    data-testid="button-share"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Share
                  </motion.button>
                </div>
              </div>
            </div>

          </div>
          </motion.div>
        </div>
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
            <Copy className="w-3 h-3" aria-hidden="true" />
            Link copied to clipboard!
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
        </div>
      )}
    </Dialog>
  );
}