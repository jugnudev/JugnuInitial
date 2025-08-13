import { useEffect, useState } from "react";
import { X, ExternalLink, Calendar, MapPin, Clock, DollarSign, Tag, Share2, Copy, ChevronDown, ChevronUp } from "lucide-react";
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

export default function DetailsModal({ event, isOpen, onClose }: DetailsModalProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });
  
  // Always call useEffect hook - no conditional logic before hooks
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
  
  // Parse description into paragraphs and check if it needs "Show more"
  const descriptionParagraphs = event?.description 
    ? event.description.split('\n\n').filter(p => p.trim().length > 0)
    : [];
  
  const descriptionLines = event?.description ? event.description.split('\n').length : 0;
  const needsShowMore = descriptionLines > 8;

  if (!isOpen || !event) return null;

  // Use imported formatters for timezone-aware display

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Mobile: Full-screen sheet */}
      <div className="md:hidden flex flex-col h-full bg-bg">
        {/* Header with close button - Mobile */}
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

        {/* Large poster on top - Mobile */}
        <div className="relative h-80 flex-shrink-0">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
              <Calendar className="w-16 h-16 text-[#c05a0e]/80" />
            </div>
          )}
        </div>

        {/* Content scroll area - Mobile */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-6 space-y-6">
            {/* Title + category pill + price */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <h1 id="modal-title" className="font-fraunces text-2xl font-bold text-white leading-tight pr-4">
                  {event.title}
                </h1>
                {event.price_from && parseFloat(event.price_from) > 0 && (
                  <div className="text-primary text-lg font-semibold shrink-0">
                    from CAD ${event.price_from}
                  </div>
                )}
              </div>
              {event.category && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium capitalize">
                  {event.category}
                </span>
              )}
            </div>

            {/* Date/time badge */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-white font-medium">{formatEventDate(event.start_at, event.timezone)}</p>
                <p className="text-muted">{formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}</p>
              </div>
            </div>

            {/* Venue + city + address */}
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

            {/* About this event */}
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

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-primary mt-1" />
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white/10 text-white text-sm rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA bar - Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg/95 backdrop-blur border-t border-white/10">
          <div className="flex gap-3">
            {/* Share button - far left */}
            <button
              onClick={(e) => handleShare(e)}
              className="p-3 border border-primary/50 text-primary rounded-xl hover:bg-primary/10 transition-colors"
              aria-label="Share event"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            <div className="flex-1">
              {event.tickets_url ? (
                <a
                  href={event.tickets_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors"
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
            </div>
          </div>
          
          {/* Secondary actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleAddToCalendar('google')}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors text-sm whitespace-nowrap"
              data-testid="button-add-google"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to Google
            </button>
            <button
              onClick={() => handleAddToCalendar('ics')}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors text-sm"
              data-testid="button-download-ics"
            >
              Download .ics
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Centered dialog, 2-column layout */}
      <div className="hidden md:flex items-center justify-center p-4 h-full">
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-bg border border-white/10 rounded-2xl overflow-hidden flex">
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

          {/* Left column: Poster */}
          <div className="w-1/2 relative">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 flex items-center justify-center">
                <Calendar className="w-16 h-16 text-[#c05a0e]/80" />
              </div>
            )}
          </div>

          {/* Right column: Content */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
              <div className="space-y-6">
                {/* Title + category pill + price */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h1 id="modal-title" className="font-fraunces text-3xl font-bold text-white leading-tight pr-4">
                      {event.title}
                    </h1>
                    {event.price_from && parseFloat(event.price_from) > 0 && (
                      <div className="text-primary text-xl font-semibold shrink-0">
                        from ${event.price_from}
                      </div>
                    )}
                  </div>
                  {event.category && (
                    <span className="inline-flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium capitalize">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Date/time badge */}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-white font-medium">{formatEventDate(event.start_at, event.timezone)}</p>
                    <p className="text-muted">{formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}</p>
                  </div>
                </div>

                {/* Venue + city + address */}
                {event.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{event.venue}</p>
                      <p className="text-muted">{event.city}</p>
                      {event.address && (
                        <p className="text-muted text-sm mt-1">{event.address}</p>
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

                {/* About this event */}
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

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-primary mt-1" />
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white/10 text-white text-sm rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Footer - Organizer Link */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-sm text-muted/70 text-center">
                    Organizer? <a 
                      href="/community/feature" 
                      className="text-primary hover:text-primary/80 transition-colors"
                      data-testid="link-organizer-feature"
                    >
                      Request to be featured
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky CTA bar - Desktop */}
            <div className="p-6 bg-bg border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                {/* Share button - far left */}
                <button
                  onClick={(e) => handleShare(e)}
                  className="p-3 border border-primary/50 text-primary rounded-xl hover:bg-primary/10 transition-colors"
                  aria-label="Share event"
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                
                <div className="flex-1">
                  {event.tickets_url ? (
                    <a
                      href={event.tickets_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors"
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
                </div>
              </div>
              
              {/* Secondary actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddToCalendar('google')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors text-sm whitespace-nowrap"
                  data-testid="button-add-google"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Google
                </button>
                <button
                  onClick={() => handleAddToCalendar('ics')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors text-sm"
                  data-testid="button-download-ics"
                >
                  Download .ics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}