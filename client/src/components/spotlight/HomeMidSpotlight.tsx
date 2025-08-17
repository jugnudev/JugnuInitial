import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SpotlightData {
  id: string; // This is the actual campaign ID
  sponsor_name: string;
  headline?: string;
  subline?: string;
  cta_text?: string;
  click_url: string;
  is_sponsored: boolean;
  creative?: {
    image_desktop_url?: string;
    image_mobile_url?: string;
    logo_url?: string;
    alt?: string;
  };
}

export function HomeMidSpotlight() {
  const [hasTrackedImpression, setHasTrackedImpression] = useState<{tracked: boolean; startTime?: number}>({tracked: false});

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/spotlight/active', 'home_mid'],
    queryFn: async () => {
      const response = await fetch('/api/spotlight/active?route=/&slots=home_mid');
      if (!response.ok) throw new Error('Failed to fetch spotlight');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const spotlight: SpotlightData | null = data?.ok ? data.spotlights?.home_mid : null;

  // Track impression when component mounts and spotlight is active
  useEffect(() => {
    if (spotlight && !hasTrackedImpression.tracked) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // 10-second debounce to prevent accidental double counts
            const now = Date.now();
            const lastImpressionKey = `lastImpression:${spotlight.id}:home_mid`;
            const lastImpression = parseInt(localStorage.getItem(lastImpressionKey) || '0', 10);
            
            if (now - lastImpression < 10000) {
              console.log('🚫 Impression debounced (< 10s since last)');
              setHasTrackedImpression({ tracked: true });
              observer.disconnect();
              return;
            }

            // Update last impression timestamp
            localStorage.setItem(lastImpressionKey, String(now));
            
            // Generate or get unique user ID
            let userId = localStorage.getItem('jugnu_user_id');
            if (!userId) {
              userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              localStorage.setItem('jugnu_user_id', userId);
            }

            // Detect device type
            const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
            
            // Track view start time for duration
            const viewStartTime = Date.now();

            // Track impression with device type
            fetch('/api/spotlight/admin/metrics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: spotlight.id,
                placement: 'home_mid',
                eventType: 'impression',
                userId: userId,
                deviceType: deviceType,
                viewDuration: 0 // Will be updated when component unmounts or banner scrolls out
              })
            }).catch(console.error);

            // Store view start time for later duration calculation
            setHasTrackedImpression({ tracked: true, startTime: viewStartTime });
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );

      const midElement = document.getElementById('home-mid-spotlight');
      if (midElement) {
        observer.observe(midElement);
      }

      return () => observer.disconnect();
    }
  }, [spotlight, hasTrackedImpression]);

  const handleClick = () => {
    if (!spotlight) return;

    // Track click event
    fetch('/api/spotlight/admin/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: spotlight.id,
        placement: 'home_mid',
        eventType: 'click'
      })
    }).catch(console.error);

    // Build redirector URL with encoded target and utm_content
    const redirectUrl = `/r/${spotlight.id}?to=${encodeURIComponent(spotlight.click_url)}&utm_content=home_mid`;
    
    // Open in new tab with proper attributes
    window.open(redirectUrl, '_blank', 'noopener,noreferrer');
  };

  // Don't render anything if no spotlight data
  if (isLoading || error || !spotlight) {
    return null;
  }

  // Determine background image based on device
  const bgImage = window.innerWidth < 768 
    ? spotlight.creative?.image_mobile_url 
    : spotlight.creative?.image_desktop_url;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Partner Spotlight heading */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-fraunces font-bold text-white mb-2">
            Partner Spotlight
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-copper-500 to-copper-600 mx-auto rounded-full"></div>
        </div>

        {/* Spotlight content */}
        <div
          id="home-mid-spotlight"
          className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl min-h-80 group"
          style={{
            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: bgImage ? undefined : '#1f2937'
          }}
          onClick={handleClick}
          data-testid="home-mid-spotlight"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

          {/* Sponsored badge */}
          {spotlight.is_sponsored && (
            <Badge 
              variant="secondary" 
              className="absolute top-6 left-6 bg-white/90 text-gray-900 border border-gray-200/50 backdrop-blur-sm"
              data-testid="sponsored-badge"
            >
              Sponsored
            </Badge>
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12 max-w-4xl">
            {/* Sponsor name */}
            <div className="text-orange-400 font-medium text-sm md:text-base mb-3 tracking-wide">
              {spotlight.sponsor_name}
            </div>

            {/* Headline */}
            {spotlight.headline && (
              <h4 className="text-white text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 max-w-2xl">
                {spotlight.headline}
              </h4>
            )}

            {/* Subline */}
            {spotlight.subline && (
              <p className="text-white/90 text-base md:text-lg lg:text-xl leading-relaxed mb-6 max-w-xl">
                {spotlight.subline}
              </p>
            )}

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <Button 
                size="lg"
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-base font-semibold transition-all duration-200 hover:scale-105 group"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                data-testid="home-mid-cta"
              >
                {spotlight.cta_text || 'Learn More'}
                <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>

              {/* Logo if available */}
              {spotlight.creative?.logo_url && (
                <div className="hidden md:block">
                  <img
                    src={spotlight.creative.logo_url}
                    alt={`${spotlight.sponsor_name} logo`}
                    className="h-10 w-auto object-contain opacity-90"
                    data-testid="sponsor-logo"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reduced motion fallback */}
          <style>{`
            @media (prefers-reduced-motion: reduce) {
              .group:hover {
                transform: none !important;
                box-shadow: none !important;
              }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}