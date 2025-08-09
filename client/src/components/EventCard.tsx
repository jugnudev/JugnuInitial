import { getCalendarLinks } from "@/lib/calendar";
import { formatEventDate } from "@/lib/dates";
import TicketButton from "./TicketButton";

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  dateISO: string | null;
  venue: string;
  city: string;
  img: string;
  buyUrl?: string;
  eventbriteId?: string;
  ticketTailorId?: string;
  soldOut?: boolean;
  waitlistUrl?: string;
  placeholder?: boolean;
}

function dateBadge(iso: string | null) {
  if (!iso) return "TBA";
  
  try {
    const d = new Date(iso);
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Vancouver" });
    const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "America/Vancouver" });
    const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "America/Vancouver" });
    
    return `${weekday.format(d).toUpperCase()} • ${month.format(d).toUpperCase()} ${day.format(d)}`;
  } catch (error) {
    return "TBA";
  }
}

interface EventCardProps {
  event: EventItem;
}

export default function EventCard({ event }: EventCardProps) {
  const hasDate = Boolean(event.dateISO);
  const badge = dateBadge(event.dateISO);

  const cal = hasDate
    ? getCalendarLinks({
        title: event.title,
        startISO: event.dateISO!,
        endISO: new Date(new Date(event.dateISO!).getTime() + 3 * 60 * 60 * 1000).toISOString(),
        location: `${event.venue}, ${event.city}`,
        description: "Jugnu — Find Your Frequency",
      })
    : null;

  const handleGoogleCalendar = () => {
    if (cal?.google) {
      window.open(cal.google, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadICS = () => {
    if (cal?.ics) {
      const link = document.createElement('a');
      link.href = cal.ics;
      link.download = `${event.slug}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <article 
      className="group bg-bg border border-white/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20"
      data-testid={`event-card-${event.id}`}
    >
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={event.img}
          alt={`${event.title} event image`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Date Badge */}
        <div className="absolute top-4 left-4 bg-primary text-black/90 px-3 py-1 rounded-lg text-sm font-medium tracking-wide">
          {badge}
        </div>
      </div>
      
      {/* Event Details */}
      <div className="p-6">
        <h3 
          className="font-fraunces text-xl font-semibold tracking-tight text-text mb-2"
          data-testid={`event-title-${event.id}`}
        >
          {event.title}
        </h3>
        <div className="text-muted mb-4 space-y-1">
          <div className="flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-accent"></i>
            <span data-testid={`event-venue-${event.id}`}>{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-city text-accent"></i>
            <span data-testid={`event-city-${event.id}`}>{event.city}</span>
          </div>
        </div>
        
        {/* Ticket Button and Calendar */}
        <div className="flex items-center justify-between">
          <TicketButton
            buyUrl={event.buyUrl}
            eventbriteId={event.eventbriteId}
            ticketTailorId={event.ticketTailorId}
            waitlistUrl={event.waitlistUrl}
            soldOut={event.soldOut}
            size="lg"
          />
          
          {/* Add to Calendar - only show when date exists */}
          {cal && hasDate && (
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={handleGoogleCalendar}
                className="p-2 text-muted hover:text-accent transition-colors duration-200"
                title="Add to Google Calendar"
                data-testid={`calendar-google-${event.id}`}
              >
                <i className="fas fa-calendar-plus"></i>
              </button>
              <button 
                type="button" 
                onClick={handleDownloadICS}
                className="p-2 text-muted hover:text-accent transition-colors duration-200"
                title="Download ICS"
                data-testid={`calendar-ics-${event.id}`}
              >
                <i className="fas fa-download"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
