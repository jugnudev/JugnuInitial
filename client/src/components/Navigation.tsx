import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useEvents, useGallery } from "@/lib/events";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: events = [] } = useEvents();
  const { data: galleryImages = [] } = useGallery();
  
  // Check if Communities feature is enabled
  const isCommunitiesEnabled = import.meta.env.VITE_ENABLE_COMMUNITIES === 'true';
  
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
              <Link
                href="/"
                className={`transition-colors duration-200 font-medium ${
                  location === '/' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-home"
              >
                Home
              </Link>
              <Link
                href="/story"
                className={`transition-colors duration-200 font-medium ${
                  location === '/story' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-story"
              >
                Story
              </Link>
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
                href="/deals"
                className={`transition-colors duration-200 font-medium ${
                  location === '/deals' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-deals"
              >
                Deals
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
              
              {/* Communities Sign Up Button */}
              {isCommunitiesEnabled && (
                <Link href="/account/signup">
                  <Button 
                    size="sm" 
                    className="ml-4 bg-accent hover:bg-accent/90 text-bg font-medium"
                    data-testid="nav-signup"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              )}
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
              <Link
                href="/"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-home"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/story"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/story' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-story"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Story
              </Link>
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
                href="/deals"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/deals' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-deals"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Deals
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
              
              {/* Communities Sign Up Button - Mobile */}
              {isCommunitiesEnabled && (
                <div className="px-3 py-2">
                  <Link href="/account/signup">
                    <Button 
                      size="sm" 
                      className="w-full bg-accent hover:bg-accent/90 text-bg font-medium"
                      data-testid="nav-mobile-signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
