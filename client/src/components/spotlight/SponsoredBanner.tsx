import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SpotlightData {
  campaignId: string;
  sponsor_name: string;
  headline?: string;
  subline?: string;
  cta_text?: string;
  click_url: string;
  is_sponsored: boolean;
  creative: {
    image_desktop_url?: string;
    image_mobile_url?: string;
    logo_url?: string;
    alt?: string;
  };
}

export function SponsoredBanner() {
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
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

  // Frequency capping - check if user has seen this campaign today
  useEffect(() => {
    if (spotlight) {
      const today = new Date().toISOString().split('T')[0];
      const seenKey = `spotlightSeen:${spotlight.campaignId}:events_banner:${today}`;
      
      if (localStorage.getItem(seenKey)) {
        setIsVisible(false);
        return;
      }

      // Mark as seen when component loads
      localStorage.setItem(seenKey, 'true');
    }
  }, [spotlight]);

  // Track impression when component mounts and spotlight is active
  useEffect(() => {
    if (spotlight && isVisible && !hasTrackedImpression) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Track impression
            fetch('/api/spotlight/admin/metrics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: spotlight.campaignId,
                placement: 'events_banner',
                kind: 'impression'
              })
            }).catch(console.error);

            setHasTrackedImpression(true);
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

  const handleClick = async () => {
    if (!spotlight) return;

    try {
      // Track click
      await fetch('/api/spotlight/admin/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: spotlight.campaignId,
          placement: 'events_banner',
          kind: 'click'
        })
      });

      // Add UTM parameters if not present
      const url = new URL(spotlight.click_url);
      if (!url.searchParams.has('utm_source')) {
        url.searchParams.set('utm_source', 'jugnu');
        url.searchParams.set('utm_medium', 'events_banner');
        url.searchParams.set('utm_campaign', 'spotlight');
      }

      // Open in new tab
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Click tracking error:', error);
      // Still open the link even if tracking fails
      window.open(spotlight.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Check if Events Banner is enabled via client-side environment variable
  const isEventsSponsorsEnabled = import.meta.env.VITE_ENABLE_EVENTS_BANNER !== 'false';

  // Don't render if no spotlight, loading, error, not visible due to frequency capping, or disabled
  if (isLoading || error || !spotlight || !isVisible || !isEventsSponsorsEnabled) {
    return null;
  }

  const bgImage = window.innerWidth >= 768 
    ? spotlight.creative.image_desktop_url 
    : spotlight.creative.image_mobile_url || spotlight.creative.image_desktop_url;

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
          {spotlight.creative.logo_url && (
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