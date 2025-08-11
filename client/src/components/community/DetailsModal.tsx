import { useEffect, useState } from "react";
import { X, ExternalLink, Calendar, MapPin, Clock, DollarSign, Tag, Share2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { getCalendarLinks } from "@/lib/calendar";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  startAt: string;
  endAt?: string;
  venue?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  organizer?: string;
  ticketsUrl?: string;
  sourceUrl?: string;
  imageUrl?: string;
  priceFrom?: string;
  tags?: string[];
  status: string;
}

interface DetailsModalProps {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetailsModal({ event, isOpen, onClose }: DetailsModalProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Parse description into paragraphs and check if it needs "Show more"
  const descriptionParagraphs = event?.description 
    ? event.description.split('\n\n').filter(p => p.trim().length > 0)
    : [];
  
  const descriptionLines = event?.description ? event.description.split('\n').length : 0;
  const needsShowMore = descriptionLines > 8;

  if (!isOpen || !event) return null;

  const formatEventDate = (startAt: string) => {
    try {
      const date = new Date(startAt);
      if (isNaN(date.getTime())) return "TBA";
      return format(date, "EEEE, MMMM d, yyyy");
    } catch {
      return "TBA";
    }
  };

  const formatEventTime = (startAt: string, endAt?: string) => {
    try {
      const start = new Date(startAt);
      if (isNaN(start.getTime())) return "Time TBA";
      
      const startTime = format(start, "h:mm a");
      
      if (endAt) {
        const end = new Date(endAt);
        if (!isNaN(end.getTime())) {
          const endTime = format(end, "h:mm a");
          return `${startTime} - ${endTime}`;
        }
      }
      
      return startTime;
    } catch {
      return "Time TBA";
    }
  };

  const handleAddToCalendar = (type: 'google' | 'ics') => {
    try {
      const startDate = new Date(event.startAt);
      if (isNaN(startDate.getTime())) {
        alert("Invalid event date");
        return;
      }
      
      const endDate = event.endAt ? new Date(event.endAt) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
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

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: event.title,
      text: `${event.title} — ${event.venue}`,
      url
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      // Final fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Share failed:', error, clipboardError);
        alert('Unable to share. Please copy the URL manually.');
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-bg border border-white/10 rounded-2xl overflow-hidden">
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label="Close modal"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Event Image */}
          <div className="relative h-64">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
                <Calendar className="w-16 h-16 text-[#c05a0e]/80" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title and Category */}
            <div>
              <h1 id="modal-title" className="font-fraunces text-3xl font-bold text-white mb-2">
                {event.title}
              </h1>
              {event.category && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium capitalize">
                  {event.category}
                </span>
              )}
            </div>

            {/* Date and Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-white font-medium">{formatEventDate(event.startAt)}</p>
                <p className="text-muted">{formatEventTime(event.startAt, event.endAt)}</p>
              </div>
            </div>

            {/* Venue */}
            {event.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-white font-medium">{event.venue}</p>
                  {event.address && (
                    <p className="text-muted">
                      {event.address}, {event.city}
                    </p>
                  )}
                  {!event.address && event.city && (
                    <p className="text-muted">{event.city}</p>
                  )}
                  <button
                    onClick={openInMaps}
                    className="text-primary hover:text-primary/80 text-sm mt-1 inline-flex items-center gap-1"
                    data-testid="button-open-maps"
                  >
                    Open in Maps <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Price */}
            {event.priceFrom && parseFloat(event.priceFrom) > 0 && (
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-primary" />
                <p className="text-white">From ${event.priceFrom}</p>
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div>
                <p className="text-muted">Organized by</p>
                <p className="text-white font-medium">{event.organizer}</p>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div>
                <p className="text-muted mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-text rounded-lg text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {descriptionParagraphs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-medium text-lg">About this event</h3>
                <div 
                  className={`text-muted space-y-2 ${
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
              {/* Primary CTA - Get Tickets */}
              {event.ticketsUrl ? (
                <a
                  href={event.ticketsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors duration-200"
                  data-testid="button-get-tickets"
                >
                  Get Tickets
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              ) : (
                <div className="w-full inline-flex items-center justify-center px-6 py-3 bg-white/10 text-muted font-medium rounded-xl cursor-not-allowed">
                  No tickets available
                </div>
              )}

              {/* Secondary Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors duration-200"
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>

                {/* Calendar Actions */}
                <button
                  onClick={() => handleAddToCalendar('google')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors duration-200 whitespace-nowrap"
                  data-testid="button-add-google"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Google
                </button>
                <button
                  onClick={() => handleAddToCalendar('ics')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors duration-200"
                  data-testid="button-download-ics"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Download .ics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}