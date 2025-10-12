import { Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail } from "lucide-react";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Check authentication state
  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const isAuthenticated = !!(authData as any)?.user;
  
  // Newsletter signup mutation
  const newsletterMutation = useMutation({
    mutationFn: (email: string) => apiRequest('POST', '/api/waitlist', {
      email,
      first_name: '',
      last_name: '',
      consent: true,
      source: 'footer'
    }),
    onSuccess: () => {
      setEmail('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  });
  
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !newsletterMutation.isPending) {
      newsletterMutation.mutate(email);
    }
  };
  
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Signup - Only show if not authenticated */}
        {!isAuthenticated && (
          <div className="mb-12 text-center">
            <h3 className="text-lg font-medium text-text mb-2">Stay Updated</h3>
            <p className="text-sm text-muted mb-4">Get the latest events and deals delivered to your inbox</p>
            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={newsletterMutation.isPending}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    data-testid="input-footer-newsletter"
                  />
                </div>
                <button
                  type="submit"
                  disabled={newsletterMutation.isPending || !email}
                  className="px-6 py-2 bg-accent hover:bg-accent/90 text-black font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-footer-newsletter"
                >
                  {newsletterMutation.isPending ? 'Subscribing...' : showSuccess ? 'Subscribed!' : 'Subscribe'}
                </button>
              </div>
              {newsletterMutation.isError && (
                <p className="text-sm text-red-500 mt-2">Failed to subscribe. Please try again.</p>
              )}
            </form>
          </div>
        )}
        
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
                href="mailto:relations@thehouseofjugnu.com" 
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
