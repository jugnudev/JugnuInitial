import { useEvents } from "@/lib/events";
import { Link } from "wouter";
import { motion } from "framer-motion";
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

  // Always render the Jugnu hero (no more spotlight hero at top)
  return (
    <section id="hero" className="relative h-[70vh] min-h-[600px] flex items-center justify-center overflow-hidden">
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

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Primary CTA - Tickets available show Get Tickets, otherwise Join Waitlist */}
            {hasTicketsAvailable ? (
              <a
                href="#events"
                onClick={(e) => { e.preventDefault(); scrollToSection('events'); }}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
                data-testid="button-get-tickets"
              >
                Get Tickets
              </a>
            ) : (
              <Link
                href="/waitlist"
                className="inline-flex items-center justify-center px-8 py-4 text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow bg-[#c05a0e]"
                data-testid="button-join-waitlist"
              >
                Join Waitlist
              </Link>
            )}
            
            {/* Secondary CTA - Explore Events */}
            <Link
              href="/events"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border border-white/20 font-medium tracking-wide rounded-2xl hover:bg-white/20 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 backdrop-blur-sm"
              data-testid="button-explore-events"
            >
              Explore Events
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 1,
            delay: 1,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 0.5
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 cursor-pointer"
               onClick={() => {
                 const nextSection = document.getElementById('this-week');
                 if (nextSection) {
                   nextSection.scrollIntoView({ behavior: 'smooth' });
                 }
               }}>
            <span className="text-xs text-muted uppercase tracking-wider">Scroll</span>
            <svg className="w-5 h-5 text-copper-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
