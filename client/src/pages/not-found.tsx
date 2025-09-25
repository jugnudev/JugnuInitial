import { Link } from "wouter";
import { useEffect } from "react";

export default function NotFound() {
  // Add SEO protection - noindex meta tag for 404 pages
  useEffect(() => {
    // Set title for SEO and cache original
    const originalTitle = document.title;
    document.title = "404 - Page Not Found | Jugnu";
    
    // Cache existing robots meta tag state
    const existingMeta = document.querySelector('meta[name="robots"]');
    const existingContent = existingMeta?.getAttribute('content');
    const hadExistingMeta = !!existingMeta;
    
    // Create or update robots meta tag for 404 noindex
    let notFoundMeta = existingMeta;
    if (!notFoundMeta) {
      notFoundMeta = document.createElement('meta');
      notFoundMeta.setAttribute('name', 'robots');
      document.head.appendChild(notFoundMeta);
    }
    notFoundMeta.setAttribute('content', 'noindex, nofollow');
    
    // Cleanup function to restore previous state
    return () => {
      // Restore original title
      document.title = originalTitle;
      
      // Restore original robots meta tag state
      if (hadExistingMeta && existingContent) {
        // Restore original content
        notFoundMeta?.setAttribute('content', existingContent);
      } else if (!hadExistingMeta && notFoundMeta) {
        // Remove the meta tag we created if it didn't exist before
        document.head.removeChild(notFoundMeta);
      }
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg">
        <div className="w-full max-w-md mx-4">
          <div className="relative">
            {/* Firefly glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-2xl"></div>
            <div className="relative bg-bg border border-white/10 rounded-2xl p-8 text-center">
              <div className="mb-6">
                <i className="fas fa-exclamation-triangle text-4xl text-accent mb-4"></i>
              </div>
              
              <h1 className="font-fraunces text-3xl font-bold tracking-tight text-primary mb-4">
                404 - Frequency Not Found
              </h1>
              
              <p className="text-muted mb-6 leading-relaxed">
                The page you're looking for seems to have drifted away like a firefly in the night.
              </p>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200"
                data-testid="back-to-home-404"
              >
                <i className="fas fa-home mr-2"></i>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
  );
}
