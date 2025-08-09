import { useState, useEffect } from "react";
import { useEvents } from "@/lib/events";

export default function MobileCTABar() {
  const { data: events = [] } = useEvents();
  const [isVisible, setIsVisible] = useState(true);

  // Determine CTA state based on events
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const hasWaitlistOnly = events.some(event => event.waitlistUrl && !hasTicketsAvailable);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const joinSection = document.getElementById('join');
      if (!joinSection) return;
      
      const joinRect = joinSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Hide CTA bar when join section is visible
      setIsVisible(!(joinRect.top <= windowHeight && joinRect.bottom >= 0));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden mobile-cta-bar bg-bg/95 backdrop-blur-lg border-t border-white/10 p-4 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      data-testid="mobile-cta-bar"
    >
      <div className="flex gap-3">
        {/* Primary CTA - context aware */}
        {hasTicketsAvailable && (
          <button
            onClick={() => scrollToSection('events')}
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-tickets"
          >
            Get Tickets
          </button>
        )}
        
        {hasWaitlistOnly && !hasTicketsAvailable && (
          <button
            onClick={() => scrollToSection('events')}
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-waitlist"
          >
            Join Waitlist
          </button>
        )}
        
        {(events.length === 0 || !hasTicketsAvailable) && (
          <button
            onClick={() => scrollToSection('join')}
            className={`${events.length === 0 ? 'flex-1' : 'flex-1'} inline-flex items-center justify-center py-3 ${
              events.length === 0 
                ? 'bg-primary text-black/90' 
                : 'border border-primary/55 text-text hover:bg-white/5'
            } font-medium tracking-wide rounded-2xl transition-all duration-200`}
            data-testid="mobile-cta-join"
          >
            Join List
          </button>
        )}
      </div>
    </div>
  );
}
