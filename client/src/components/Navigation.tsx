import { useState } from "react";
import { useEvents, useGallery } from "@/lib/events";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: events = [] } = useEvents();
  const { data: galleryImages = [] } = useGallery();
  
  // Determine what nav items to show
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const showEvents = hasTicketsAvailable;
  const showGallery = galleryImages.length > 0;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-bg/80 border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/">
              <img 
                src={logoImage}
                alt="Jugnu - Find Your Frequency"
                className="h-8 cursor-pointer"
                data-testid="nav-logo"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex h-12 items-center gap-x-6">
              {showEvents && (
                <button
                  onClick={() => scrollToSection('events')}
                  className="text-text hover:text-accent transition-colors duration-200 font-medium"
                  data-testid="nav-events"
                >
                  Events
                </button>
              )}
              <a
                href="/#story"
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-story"
              >
                Story
              </a>
              <a
                href="/events"
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-events"
              >
                Events
              </a>
              <a
                href="/places"
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-places"
              >
                Places
              </a>
              <a
                href="/saved"
                className="text-text hover:text-accent transition-colors duration-200 font-medium flex items-center gap-1"
                data-testid="nav-saved"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 9.02C20.98 14.45 12.5 20.5 12 21c-.5-.5-8.98-6.55-9-12.98C3 5.52 5.52 3 8.02 3c1.8 0 3.4.88 4.38 2.34A5.01 5.01 0 0116.02 3C18.48 3 21 5.52 21 9.02z"/>
                </svg>
                Saved
              </a>
              <a
                href="/saved"
                className="text-text hover:text-accent transition-colors duration-200 font-medium flex items-center gap-1"
                data-testid="nav-saved"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 9.02C20.98 14.45 12.5 20.5 12 21c-.5-.5-8.98-6.55-9-12.98C3 5.52 5.52 3 8.02 3c1.8 0 3.4.88 4.38 2.34A5.01 5.01 0 0116.02 3C18.48 3 21 5.52 21 9.02z"/>
                </svg>
                Saved
              </a>
              {showGallery && (
                <button
                  onClick={() => scrollToSection('gallery')}
                  className="text-text hover:text-accent transition-colors duration-200 font-medium"
                  data-testid="nav-gallery"
                >
                  Gallery
                </button>
              )}
              <a
                href="/waitlist"
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-waitlist"
              >
                Join
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg p-2"
              data-testid="nav-mobile-toggle"
              aria-label="Toggle mobile menu"
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-bg/95 backdrop-blur-lg border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {showEvents && (
                <button
                  onClick={() => scrollToSection('events')}
                  className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                  data-testid="nav-mobile-events"
                >
                  Events
                </button>
              )}
              <a
                href="/#story"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-story"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Story
              </a>
              <a
                href="/events"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-events"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Events
              </a>
              <a
                href="/places"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-places"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Places
              </a>
              <a
                href="/saved"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium flex items-center gap-1"
                data-testid="nav-mobile-saved"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 9.02C20.98 14.45 12.5 20.5 12 21c-.5-.5-8.98-6.55-9-12.98C3 5.52 5.52 3 8.02 3c1.8 0 3.4.88 4.38 2.34A5.01 5.01 0 0116.02 3C18.48 3 21 5.52 21 9.02z"/>
                </svg>
                Saved
              </a>
              {showGallery && (
                <button
                  onClick={() => scrollToSection('gallery')}
                  className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                  data-testid="nav-mobile-gallery"
                >
                  Gallery
                </button>
              )}
              <a
                href="/waitlist"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-waitlist"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Join
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
