import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, ExternalLink, Clock, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { getCalendarLinks } from "@/lib/calendar";

interface CommunityEvent {
  id: string;
  title: string;
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

const tagFilters = [
  { label: "All", value: "" },
  { label: "Concert", value: "concert" },
  { label: "Club", value: "club" },
  { label: "Comedy", value: "comedy" },
  { label: "Festival", value: "festival" },
];

export default function Community() {
  const [selectedTag, setSelectedTag] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/community/weekly", selectedTag],
    queryFn: async () => {
      const url = selectedTag 
        ? `/api/community/weekly?tag=${encodeURIComponent(selectedTag)}`
        : "/api/community/weekly";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const events: CommunityEvent[] = data?.events || [];

  const formatEventDate = (startAt: string) => {
    try {
      const date = new Date(startAt);
      if (isNaN(date.getTime())) {
        return "TBA";
      }
      const dayOfWeek = format(date, "EEE").toUpperCase();
      const monthDay = format(date, "MMM d").toUpperCase();
      return `${dayOfWeek} • ${monthDay}`;
    } catch (error) {
      console.error("Error formatting date:", startAt, error);
      return "TBA";
    }
  };

  const formatEventTime = (startAt: string, endAt?: string) => {
    try {
      const start = new Date(startAt);
      if (isNaN(start.getTime())) {
        return "Time TBA";
      }
      const startTime = format(start, "h:mm a");
      
      if (endAt) {
        const end = new Date(endAt);
        if (!isNaN(end.getTime())) {
          const endTime = format(end, "h:mm a");
          return `${startTime} - ${endTime}`;
        }
      }
      
      return startTime;
    } catch (error) {
      console.error("Error formatting time:", startAt, endAt, error);
      return "Time TBA";
    }
  };

  const handleAddToCalendar = (event: CommunityEvent) => {
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

      // Create a simple menu to choose calendar app
      const userChoice = confirm("Add to Google Calendar? (OK for Google, Cancel to download ICS file)");
      if (userChoice) {
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

  const renderEventCard = (event: CommunityEvent) => (
    <div key={event.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors duration-200">
      {/* Event Image */}
      <div className="mb-4">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover rounded-2xl"
            loading="lazy"
          />
        ) : (
          <div className="relative w-full h-48 bg-gradient-to-br from-[#c05a0e]/30 via-[#d4691a]/20 to-[#b8540d]/25 rounded-2xl overflow-hidden">
            {/* Firefly glow effect */}
            <div className="absolute inset-0">
              <div className="firefly-small absolute top-6 left-8 w-2 h-2 bg-[#c05a0e]/60 rounded-full animate-pulse"></div>
              <div className="firefly-small absolute bottom-8 right-12 w-1.5 h-1.5 bg-[#d4691a]/50 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }}></div>
              <div className="firefly-small absolute top-12 right-6 w-1 h-1 bg-[#b8540d]/70 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
            <div className="flex items-center justify-center h-full relative z-10">
              <Calendar className="w-12 h-12 text-[#c05a0e]/80" />
            </div>
          </div>
        )}
      </div>

      {/* Date Badge */}
      <div className="inline-flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium mb-3">
        {formatEventDate(event.startAt)}
      </div>

      {/* Event Title and Price */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-fraunces text-xl font-bold text-white line-clamp-2 flex-1">
          {event.title}
        </h3>
        {event.priceFrom && (
          <div className="inline-flex items-center px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium ml-3 flex-shrink-0">
            <DollarSign className="w-3 h-3 mr-1" />
            from ${event.priceFrom}
          </div>
        )}
      </div>

      {/* Venue & Location */}
      {event.venue && (
        <div className="flex items-start text-muted mb-2">
          <MapPin className="w-4 h-4 mt-1 mr-2 flex-shrink-0" />
          <span className="text-sm">
            {event.venue}
            {(event.neighborhood || event.city) && (
              <span className="text-muted/70">
                {" • "}{event.neighborhood || event.city}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Time */}
      <div className="flex items-center text-muted mb-4">
        <Clock className="w-4 h-4 mr-2" />
        <span className="text-sm">{formatEventTime(event.startAt, event.endAt)}</span>
      </div>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 bg-white/10 text-text rounded-full text-xs font-medium capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Organizer */}
      {event.organizer && (
        <p className="text-sm text-muted mb-4">
          By {event.organizer}
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 ml-1"
              data-testid={`link-source-${event.id}`}
            >
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          )}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {event.ticketsUrl && (
          <a
            href={event.ticketsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors duration-200"
            data-testid={`button-tickets-${event.id}`}
          >
            Get Tickets
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        )}
        
        <button
          onClick={() => handleAddToCalendar(event)}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-primary/50 text-primary font-medium rounded-xl hover:bg-primary/10 transition-colors duration-200"
          data-testid={`button-calendar-${event.id}`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-bg text-text py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#c05a0e]">
              South Asian Events in Vancouver
            </h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">This Month</p>
            <p className="text-lg text-muted/80 max-w-2xl mx-auto mt-2">
              Concerts, club nights, comedy, and festivals. Community-curated.
            </p>
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {tagFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedTag(filter.value)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${
                  selectedTag === filter.value
                    ? "bg-primary text-black"
                    : "bg-white/10 text-text hover:bg-white/20"
                }`}
                data-testid={`filter-${filter.value || "all"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted mt-4">Loading events...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-400">Failed to load events. Please try again later.</p>
            </div>
          )}

          {/* Events Grid */}
          {!isLoading && !error && events.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map(renderEventCard)}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="font-fraunces text-2xl font-bold text-white mb-2">
                No events this week
              </h3>
              <p className="text-muted max-w-md mx-auto mb-6">
                No listings for the next 7 days. Check back soon or follow @thehouseofjugnu.
              </p>
              <a
                href="https://instagram.com/thehouseofjugnu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary text-black/90 font-medium rounded-xl hover:bg-primary/90 transition-colors duration-200"
                data-testid="link-instagram"
              >
                Follow @thehouseofjugnu
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}