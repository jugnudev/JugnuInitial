import { useEvents } from "@/lib/events";
import heroLogoImage from "@assets/Upscaled Logo copy_1754763190534.png";

export default function Hero() {
  const { data: events = [] } = useEvents();

  // Determine CTA state based on events - waitlist mode logic
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const hasWaitlistEvents = events.some(event => event.waitlistUrl);
  const isWaitlistMode = !hasTicketsAvailable && hasWaitlistEvents;
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
          <h2 className="font-fraunces text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mb-8 text-[#c05a0e]">
            Find Your Frequency
          </h2>
          
          {/* Description */}
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Curated South Asian & global culture—nights, pop-ups, and experiences in Vancouver.
          </p>

          {/* Single CTA */}
          <div className="flex justify-center">
            {/* Tickets available - show Get Tickets */}
            {hasTicketsAvailable && (
              <a
                href="#events"
                onClick={(e) => { e.preventDefault(); scrollToSection('events'); }}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-get-tickets"
              >
                Get Tickets
              </a>
            )}
            
            {/* Waitlist mode OR no events - always show Join Waitlist */}
            {(isWaitlistMode || hasNoEvents) && (
              <a
                href="/waitlist"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-join-waitlist"
              >
                Join Waitlist
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
