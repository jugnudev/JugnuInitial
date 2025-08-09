import { useState } from "react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <div 
              className="text-primary font-fraunces text-2xl font-semibold tracking-tight cursor-pointer"
              onClick={() => scrollToSection('hero')}
              data-testid="nav-logo"
            >
              Jugnu
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button
                onClick={() => scrollToSection('events')}
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-events"
              >
                Events
              </button>
              <button
                onClick={() => scrollToSection('story')}
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-story"
              >
                Story
              </button>
              <button
                onClick={() => scrollToSection('gallery')}
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-gallery"
              >
                Gallery
              </button>
              <button
                onClick={() => scrollToSection('join')}
                className="text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-join"
              >
                Join
              </button>
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
              <button
                onClick={() => scrollToSection('events')}
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-events"
              >
                Events
              </button>
              <button
                onClick={() => scrollToSection('story')}
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-story"
              >
                Story
              </button>
              <button
                onClick={() => scrollToSection('gallery')}
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-gallery"
              >
                Gallery
              </button>
              <button
                onClick={() => scrollToSection('join')}
                className="block w-full text-left px-3 py-2 text-text hover:text-accent transition-colors duration-200 font-medium"
                data-testid="nav-mobile-join"
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
