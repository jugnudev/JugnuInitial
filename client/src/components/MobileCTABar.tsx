import { useState, useEffect } from "react";
import { useEvents } from "@/lib/events";

export default function MobileCTABar() {
  const { data: events = [] } = useEvents();
  const [isVisible, setIsVisible] = useState(true);

  // Determine CTA state based on events - waitlist mode logic
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const hasWaitlistEvents = events.some(event => event.waitlistUrl);
  const isWaitlistMode = !hasTicketsAvailable && hasWaitlistEvents;

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

    const handleFocus = (e: FocusEvent) => {
      // Hide when input in join section is focused (avoid keyboard overlap)
      const joinSection = document.getElementById('join');
      if (joinSection && e.target instanceof HTMLInputElement && joinSection.contains(e.target)) {
        setIsVisible(false);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Show again when input loses focus (with delay to handle quick focus changes)
      setTimeout(() => {
        const joinSection = document.getElementById('join');
        if (joinSection && e.target instanceof HTMLInputElement && joinSection.contains(e.target)) {
          handleScroll(); // Re-check visibility based on scroll position
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden mobile-cta-bar bg-bg/95 backdrop-blur-lg border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      data-testid="mobile-cta-bar"
    >
      <div className="flex gap-3">
        {/* Primary CTA - Tickets available */}
        {hasTicketsAvailable && (
          <a
            href="#events"
            onClick={(e) => { e.preventDefault(); scrollToSection('events'); }}
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-tickets"
          >
            Get Tickets
          </a>
        )}
        
        {/* Primary CTA - Waitlist mode */}
        {isWaitlistMode && (
          <a
            href="/waitlist"
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-waitlist"
          >
            Join Waitlist
          </a>
        )}
        
        {/* Primary CTA - No events */}
        {events.length === 0 && (
          <a
            href="#join"
            onClick={(e) => { e.preventDefault(); scrollToSection('join'); }}
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-join-primary"
          >
            Join List
          </a>
        )}
        
        {/* Secondary CTA - Join List (when not primary) */}
        {(hasTicketsAvailable || isWaitlistMode) && (
          <a
            href="#join"
            onClick={(e) => { e.preventDefault(); scrollToSection('join'); }}
            className="flex-1 inline-flex items-center justify-center py-3 border border-primary/55 text-text hover:bg-white/5 font-medium tracking-wide rounded-2xl transition-all duration-200"
            data-testid="mobile-cta-join"
          >
            Join List
          </a>
        )}
      </div>
    </div>
  );
}
