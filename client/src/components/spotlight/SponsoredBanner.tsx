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
  freq_cap_per_user_per_day?: number;
  creative?: {
    image_desktop_url?: string;
    image_mobile_url?: string;
    logo_url?: string;
    alt?: string;
  };
}

export function SponsoredBanner() {
  const [hasTrackedImpression, setHasTrackedImpression] = useState<{tracked: boolean; startTime?: number}>({tracked: false});
  const [isVisible, setIsVisible] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/spotlight/active', 'events_banner'],
    queryFn: async () => {
      const response = await fetch('/api/spotlight/active?placement=events_banner');
      if (!response.ok) throw new Error('Failed to fetch spotlight');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const spotlight: SpotlightData | null = data?.ok ? data.spotlights?.events_banner : null;

  // Frequency capping - check if user has seen this campaign today based on campaign settings
  useEffect(() => {
    if (spotlight) {
      // Debug mode bypass frequency capping (dev only)
      const urlParams = new URLSearchParams(window.location.search);
      const debugSponsor = urlParams.get('debugSponsor') === '1';
      
      if (debugSponsor && import.meta.env.DEV) {
        console.log('🔧 Debug mode: Bypassing frequency capping for sponsor banner');
        return; // Skip frequency capping logic
      }

      // Get frequency cap from spotlight data (default to 0 for unlimited if not provided)
      const freqCap = spotlight.freq_cap_per_user_per_day ?? 0;
      
      // If frequency cap is 0, no limit
      if (freqCap === 0) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const seenKey = `spotlightSeen:${spotlight.id}:events_banner:${today}`;
      const seenCount = parseInt(localStorage.getItem(seenKey) || '0', 10);
      
      if (seenCount >= freqCap) {
        setIsVisible(false);
        return;
      }
    }
  }, [spotlight]);

  // Track impression when component mounts and spotlight is active
  useEffect(() => {
    if (spotlight && isVisible && !hasTrackedImpression.tracked) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Track raw view (always counted)
            const today = new Date().toISOString().split('T')[0];
            const freqCap = spotlight.freq_cap_per_user_per_day ?? 0;
            const seenKey = `spotlightSeen:${spotlight.id}:events_banner:${today}`;
            const seenCount = parseInt(localStorage.getItem(seenKey) || '0', 10);
            
            // 10-second debounce to prevent accidental double counts
            const now = Date.now();
            const lastImpressionKey = `lastImpression:${spotlight.id}:events_banner`;
            const lastImpression = parseInt(localStorage.getItem(lastImpressionKey) || '0', 10);
            
            if (now - lastImpression < 10000) {
              console.log('🚫 Impression debounced (< 10s since last)');
              setHasTrackedImpression({ tracked: true });
              observer.disconnect();
              return;
            }

            // Determine if this is a billable impression
            const isBillable = freqCap === 0 || seenCount < freqCap;
            
            // Update seen count and last impression timestamp
            localStorage.setItem(seenKey, String(seenCount + 1));
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

            // Track both raw view and billable impression with device type
            fetch('/api/spotlight/admin/metrics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: spotlight.id,
                placement: 'events_banner',
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

      const bannerElement = document.getElementById('sponsored-banner');
      if (bannerElement) {
        observer.observe(bannerElement);
      }

      return () => observer.disconnect();
    }
  }, [spotlight, isVisible, hasTrackedImpression]);

  const handleClick = () => {
    if (!spotlight) return;

    // Track click event
    fetch('/api/spotlight/admin/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: spotlight.id,
        placement: 'events_banner',
        eventType: 'click'
      })
    }).catch(console.error);

    // Build redirector URL with encoded target and utm_content  
    const redirectUrl = `/r/${spotlight.id}?to=${encodeURIComponent(spotlight.click_url)}&utm_content=events_banner`;
    
    // Open in new tab with proper attributes
    window.open(redirectUrl, '_blank', 'noopener,noreferrer');
  };

  // Check if Events Banner is enabled via client-side environment variable
  const isEventsSponsorsEnabled = import.meta.env.VITE_ENABLE_EVENTS_BANNER !== 'false';

  // Don't render if no spotlight, loading, error, not visible due to frequency capping, or disabled
  if (isLoading || error || !spotlight || !isVisible || !isEventsSponsorsEnabled) {
    return null;
  }

  const bgImage = window.innerWidth >= 768 
    ? spotlight.creative?.image_desktop_url 
    : spotlight.creative?.image_mobile_url || spotlight.creative?.image_desktop_url;

  return (
    <div
      id="sponsored-banner"
      className="relative w-full h-32 md:h-40 lg:h-48 rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-orange-200/30 my-8"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: bgImage ? undefined : '#f97316'
      }}
      onClick={handleClick}
      data-testid="sponsored-banner"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Sponsored badge */}
      {spotlight.is_sponsored && (
        <Badge 
          variant="secondary" 
          className="absolute top-3 left-3 bg-white/90 text-gray-900 border border-gray-200/50 backdrop-blur-sm text-xs"
          data-testid="sponsored-badge"
        >
          Sponsored
        </Badge>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex-1 min-w-0">
          {/* Sponsor name */}
          <div className="text-orange-400 font-medium text-xs md:text-sm mb-1 tracking-wide">
            {spotlight.sponsor_name}
          </div>

          {/* Headline */}
          {spotlight.headline && (
            <h3 className="text-white text-base md:text-lg lg:text-xl font-bold leading-tight mb-1 truncate">
              {spotlight.headline}
            </h3>
          )}

          {/* Subline */}
          {spotlight.subline && (
            <p className="text-white/90 text-sm md:text-base leading-snug line-clamp-2">
              {spotlight.subline}
            </p>
          )}
        </div>

        {/* CTA and Logo */}
        <div className="flex items-center gap-3 ml-4">
          {/* Logo if available */}
          {spotlight.creative?.logo_url && (
            <div className="hidden md:block">
              <img
                src={spotlight.creative.logo_url}
                alt={`${spotlight.sponsor_name} logo`}
                className="h-8 w-auto object-contain opacity-90"
                data-testid="sponsor-logo"
              />
            </div>
          )}

          {/* CTA Button */}
          <Button 
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 group shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            data-testid="sponsored-cta"
          >
            {spotlight.cta_text || 'Learn More'}
            <ExternalLink className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
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
  );
}