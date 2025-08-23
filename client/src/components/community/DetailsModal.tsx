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
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md"
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
            className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full text-white transition-all duration-200"
            aria-label="Close modal"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 16:9 Aspect Ratio Image Container - Mobile */}
        <div className="relative w-full aspect-video bg-black flex-shrink-0">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
              <Calendar className="w-20 h-20 text-primary/40" />
            </div>
          )}
        </div>

        {/* Content scroll area - Mobile */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-6 space-y-5">
            {/* Category Badge */}
            {event.category && (
              <span className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                {event.category}
              </span>
            )}

            {/* Title */}
            <div>
              <h1 id="modal-title" className="font-fraunces text-3xl font-bold text-white leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Date/Time Section */}
            <div className="flex items-start gap-4 py-4 border-y border-white/10">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-semibold text-base">{formatEventDate(event.start_at, event.timezone)}</p>
                <p className="text-muted text-sm mt-1">{formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}</p>
              </div>
            </div>

            {/* Location Section */}
            {event.venue && (
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-semibold text-base">{event.venue}</p>
                  <p className="text-muted text-sm mt-1">{event.city}</p>
                  {event.address && (
                    <p className="text-muted/70 text-sm mt-1">{event.address}</p>
                  )}
                  <button
                    onClick={openInMaps}
                    className="text-primary hover:text-primary/80 text-sm font-medium mt-2 inline-flex items-center gap-1.5 transition-colors"
                    data-testid="button-open-maps"
                  >
                    Open in Maps <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* About Section */}
            {descriptionParagraphs.length > 0 && (
              <div className="pt-4">
                <h3 className="text-white font-semibold text-base mb-3">About this event</h3>
                <div 
                  className={`text-muted/90 space-y-3 text-sm leading-relaxed ${
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
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium mt-3 transition-colors"
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
              <div className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-white/5 text-white/70 text-xs rounded-full border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar - Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg/95 backdrop-blur-md border-t border-white/10">
          {/* Primary Action */}
          <div className="flex gap-3 mb-3">
            <button
              onClick={(e) => handleShare(e)}
              className="p-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all duration-200"
              aria-label="Share event"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {event.tickets_url ? (
              <a
                href={event.tickets_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 gap-2"
                data-testid="button-get-tickets"
              >
                Get Tickets
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-white/5 text-muted font-medium rounded-xl">
                No tickets available
              </div>
            )}
          </div>
          
          {/* Calendar Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleAddToCalendar('google')}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white/5 text-white/70 text-xs font-medium rounded-lg hover:bg-white/10 transition-all duration-200 gap-1.5"
              data-testid="button-add-google"
            >
              <Calendar className="w-3.5 h-3.5" />
              Add to Google
            </button>
            <button
              onClick={() => handleAddToCalendar('ics')}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white/5 text-white/70 text-xs font-medium rounded-lg hover:bg-white/10 transition-all duration-200"
              data-testid="button-download-ics"
            >
              Download .ics
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Centered dialog */}
      <div className="hidden md:flex items-center justify-center p-6 h-full">
        <div className="relative w-full max-w-6xl max-h-[85vh] bg-bg rounded-2xl overflow-hidden shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full text-white transition-all duration-200"
            aria-label="Close modal"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex h-full">
            {/* Left: 16:9 Image */}
            <div className="w-1/2 relative bg-black">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-full aspect-video">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
                      <Calendar className="w-24 h-24 text-primary/40" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="w-1/2 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
                  {/* Category Badge */}
                  {event.category && (
                    <span className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                      {event.category}
                    </span>
                  )}

                  {/* Title */}
                  <div>
                    <h1 id="modal-title" className="font-fraunces text-4xl font-bold text-white leading-tight">
                      {event.title}
                    </h1>
                  </div>

                  {/* Date/Time Section */}
                  <div className="flex items-start gap-4 py-5 border-y border-white/10">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{formatEventDate(event.start_at, event.timezone)}</p>
                      <p className="text-muted text-base mt-1">{formatEventTime(event.start_at, event.end_at, event.timezone, event.is_all_day)}</p>
                    </div>
                  </div>

                  {/* Location Section */}
                  {event.venue && (
                    <div className="flex items-start gap-4">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{event.venue}</p>
                        <p className="text-muted text-base">{event.city}</p>
                        {event.address && (
                          <p className="text-muted/70 text-sm mt-1">{event.address}</p>
                        )}
                        <button
                          onClick={openInMaps}
                          className="text-primary hover:text-primary/80 text-sm font-medium mt-3 inline-flex items-center gap-1.5 transition-colors"
                          data-testid="button-open-maps"
                        >
                          Open in Maps <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* About Section */}
                  {descriptionParagraphs.length > 0 && (
                    <div className="pt-4">
                      <h3 className="text-white font-semibold text-lg mb-4">About this event</h3>
                      <div 
                        className={`text-muted/90 space-y-3 text-base leading-relaxed ${
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
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium mt-3 transition-colors"
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
                    <div className="pt-4">
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Footer Link */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-sm text-muted/60 text-center">
                      Don't see your event? <a 
                        href="/community/feature" 
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                        data-testid="link-organizer-feature"
                      >
                        Request to have it listed
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Actions - Desktop */}
              <div className="p-6 bg-bg/50 backdrop-blur-sm border-t border-white/10">
                {/* Primary Action */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={(e) => handleShare(e)}
                    className="p-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all duration-200"
                    aria-label="Share event"
                    data-testid="button-share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  
                  {event.tickets_url ? (
                    <a
                      href={event.tickets_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 gap-2"
                      data-testid="button-get-tickets"
                    >
                      Get Tickets
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-white/5 text-muted font-medium rounded-xl">
                      No tickets available
                    </div>
                  )}
                </div>
                
                {/* Calendar Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCalendar('google')}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white/5 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 transition-all duration-200 gap-2"
                    data-testid="button-add-google"
                  >
                    <Calendar className="w-4 h-4" />
                    Add to Google
                  </button>
                  <button
                    onClick={() => handleAddToCalendar('ics')}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white/5 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 transition-all duration-200"
                    data-testid="button-download-ics"
                  >
                    Download .ics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification for copied link */}
      {showCopiedToast && (
        <div
          className="fixed z-[60] px-4 py-2.5 bg-black/95 backdrop-blur-sm text-white text-sm rounded-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-200 ease-out shadow-lg"
          style={{
            left: `${toastPosition.x}px`,
            top: `${toastPosition.y}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5" />
            Link copied to clipboard!
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
        </div>
      )}
    </div>
  );
}