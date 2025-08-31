import { useEvents } from "@/lib/events";
import EventCard from "./EventCard";

export default function Events() {
  const { data: events = [], isLoading } = useEvents();
  
  // Check if there are any purchasable events
  const hasPurchasableEvents = events.some(event => 
    event.buyUrl || event.eventbriteId || event.ticketTailorId
  );
  
  // In waitlist mode (no purchasable events), hide the entire section
  if (!isLoading && !hasPurchasableEvents) {
    return <div id="events" className="hidden"></div>;
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <section id="events" className="py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
              Upcoming Events
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Where strangers sync and the room finds one frequency
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/10 rounded-2xl h-64"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="events" className="py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
            Upcoming Events
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Where strangers sync and the room finds one frequency
          </p>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16" data-testid="events-empty-state">
            <div className="relative max-w-md mx-auto">
              {/* Firefly glow behind card */}
              <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-2xl"></div>
              <div className="relative bg-bg border border-white/10 rounded-2xl p-8">
                <div className="mb-6">
                  <i className="fas fa-calendar-plus text-4xl text-accent mb-4"></i>
                </div>
                <h3 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mb-4">
                  New dates are lighting up soon.
                </h3>
                <p className="text-muted mb-6">
                  Be first when the frequency hits. Join the list.
                </p>
                <a
                  href="/waitlist"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 btn-glow"
                  data-testid="button-join-waitlist-empty"
                >
                  Join
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
