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
      // Hide on waitlist page
      if (window.location.pathname === '/waitlist') {
        setIsVisible(false);
        return;
      }
      
      // Hide when scrolled to bottom of page (near footer)
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      // Hide when near the bottom (within 200px)
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      // Hide when any input is focused (avoid keyboard overlap)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setIsVisible(false);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Show again when input loses focus (with delay to handle quick focus changes)
      setTimeout(() => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          handleScroll(); // Re-check visibility based on scroll position
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    
    // Initial check
    handleScroll();
    
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
      <div className="flex">
        {/* Single CTA - Tickets available */}
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
        
        {/* Single CTA - Waitlist mode OR no events */}
        {(isWaitlistMode || events.length === 0) && (
          <a
            href="/waitlist"
            className="flex-1 inline-flex items-center justify-center py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 transition-all duration-200"
            data-testid="mobile-cta-waitlist"
          >
            Join Waitlist
          </a>
        )}
      </div>
    </div>
  );
}
