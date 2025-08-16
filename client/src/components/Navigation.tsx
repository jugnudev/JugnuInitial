import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useEvents, useGallery } from "@/lib/events";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";

export default function Navigation() {
  const [location] = useLocation();
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
              <a
                href="/#story"
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-story"
              >
                Story
              </a>
              <Link
                href="/events"
                className={`transition-colors duration-200 font-medium ${
                  location === '/events' || location.startsWith('/explore')
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-events"
              >
                Events
              </Link>
              <Link
                href="/promote"
                className={`transition-colors duration-200 font-medium ${
                  location === '/promote' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-promote"
              >
                Promote
              </Link>

              <Link
                href="/waitlist"
                className={`transition-colors duration-200 font-medium ${
                  location === '/waitlist' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-waitlist"
              >
                Join
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text hover:text-accent focus-ring p-2 transition-colors duration-200"
              data-testid="nav-mobile-toggle"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-bg/95 backdrop-blur-lg border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a
                href="/#story"
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-story"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Story
              </a>
              <Link
                href="/events"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/events' || location.startsWith('/explore')
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-events"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/promote"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/promote' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-promote"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Promote
              </Link>

              <Link
                href="/waitlist"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/waitlist' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-waitlist"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Join
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
