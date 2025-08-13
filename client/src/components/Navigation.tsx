import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useEvents, useGallery } from "@/lib/events";
import { useFavorites } from "@/stores/favorites";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { data: events = [] } = useEvents();
  const { data: galleryImages = [] } = useGallery();
  const { getFavoriteEvents, getFavoritePlaces } = useFavorites();
  
  // Determine what nav items to show
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const showEvents = hasTicketsAvailable;
  const showGallery = galleryImages.length > 0;

  // Calculate saved count on mount and when favorites change
  useEffect(() => {
    const updateSavedCount = () => {
      const eventCount = getFavoriteEvents().length;
      const placeCount = getFavoritePlaces().length;
      setSavedCount(eventCount + placeCount);
    };

    updateSavedCount();

    // Listen for storage changes to update count when favorites are toggled
    const handleStorageChange = () => updateSavedCount();
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for Zustand store updates
    const unsubscribe = useFavorites.subscribe(updateSavedCount);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribe();
    };
  }, [getFavoriteEvents, getFavoritePlaces]);

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
                href="/explore"
                className={`transition-colors duration-200 font-medium ${
                  location.startsWith('/explore') 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-explore"
              >
                Explore
              </Link>
              <Link
                href="/events"
                className={`transition-colors duration-200 font-medium ${
                  location === '/events' 
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
                href="/saved"
                className={`transition-colors duration-200 font-medium flex items-center gap-2 ${
                  location === '/saved' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-saved"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 9.02C20.98 14.45 12.5 20.5 12 21c-.5-.5-8.98-6.55-9-12.98C3 5.52 5.52 3 8.02 3c1.8 0 3.4.88 4.38 2.34A5.01 5.01 0 0116.02 3C18.48 3 21 5.52 21 9.02z"/>
                </svg>
                Saved
                {savedCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-copper-500 text-black text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center"
                    data-testid="nav-saved-count"
                  >
                    {savedCount}
                  </Badge>
                )}
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
                href="/explore"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location.startsWith('/explore') 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-explore"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Explore
              </Link>
              <Link
                href="/events"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/events' 
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
                href="/saved"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium flex items-center gap-2 ${
                  location === '/saved' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-saved"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 9.02C20.98 14.45 12.5 20.5 12 21c-.5-.5-8.98-6.55-9-12.98C3 5.52 5.52 3 8.02 3c1.8 0 3.4.88 4.38 2.34A5.01 5.01 0 0116.02 3C18.48 3 21 5.52 21 9.02z"/>
                </svg>
                Saved
                {savedCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-copper-500 text-black text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center"
                    data-testid="nav-mobile-saved-count"
                  >
                    {savedCount}
                  </Badge>
                )}
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
