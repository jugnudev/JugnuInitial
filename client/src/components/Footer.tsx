import { Link } from "wouter";
import logoImage from "@assets/JUGNU_1754703056265.png";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          {/* Logo and social */}
          <div className="text-center md:text-left">
            <img 
              src={logoImage}
              alt="Jugnu - Find Your Frequency"
              className="h-8 mb-4 mx-auto md:mx-0"
            />
            <div className="flex items-center justify-center md:justify-start space-x-4">
              <a 
                href="https://instagram.com/thehouseofjugnu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted hover:text-accent transition-colors duration-200"
                aria-label="Follow us on Instagram"
                data-testid="link-instagram"
              >
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a 
                href="mailto:hello@jugnu.events" 
                className="text-muted hover:text-accent transition-colors duration-200"
                aria-label="Email us"
                data-testid="link-email"
              >
                <i className="fas fa-envelope text-xl"></i>
              </a>
            </div>
          </div>

          {/* Legal links */}
          <div className="flex items-center space-x-6 text-sm text-muted">
            <span>&copy; 2025 Jugnu</span>
            <Link 
              href="/privacy" 
              className="hover:text-accent transition-colors duration-200"
              data-testid="link-privacy"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-accent transition-colors duration-200"
              data-testid="link-terms"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
