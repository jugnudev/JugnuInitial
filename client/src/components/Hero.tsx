import { useEvents } from "@/lib/events";
import heroLogoImage from "@assets/JUGNU_1754702613935.png";

export default function Hero() {
  const { data: events = [] } = useEvents();

  // Determine CTA state based on events
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const hasWaitlistOnly = events.some(event => event.waitlistUrl && !hasTicketsAvailable);
  const hasNoEvents = events.length === 0;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Firefly dots */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-glow/10 via-transparent to-transparent"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main heading */}
          <div className="mb-8">
            <img 
              src={heroLogoImage}
              alt="Jugnu - Find Your Frequency"
              className="h-32 sm:h-48 lg:h-64 xl:h-72 mx-auto max-w-full"
            />
          </div>
          
          {/* Subheading */}
          <h2 className="font-fraunces text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-accent mb-8">
            Find Your Frequency
          </h2>
          
          {/* Description */}
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Curated South Asian & global culture—nights, pop-ups, and experiences in Vancouver.
          </p>

          {/* Dynamic CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {hasTicketsAvailable && (
              <button
                onClick={() => scrollToSection('events')}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-get-tickets"
              >
                Get Tickets
              </button>
            )}
            
            {hasWaitlistOnly && !hasTicketsAvailable && (
              <button
                onClick={() => scrollToSection('events')}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-join-waitlist"
              >
                Join Waitlist
              </button>
            )}
            
            {!hasNoEvents && (
              <button
                onClick={() => scrollToSection('join')}
                className="inline-flex items-center justify-center px-8 py-4 border border-primary/55 text-text font-medium tracking-wide rounded-2xl hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200"
                data-testid="button-join-list"
              >
                Join the List
              </button>
            )}
            
            {hasNoEvents && (
              <button
                onClick={() => scrollToSection('join')}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-join-list-primary"
              >
                Join the List
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
