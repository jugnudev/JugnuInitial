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
  creative?: {
    image_desktop_url?: string;
    image_mobile_url?: string;
    logo_url?: string;
    alt?: string;
  };
}

interface SpotlightHeroProps {
  fallbackContent?: React.ReactNode;
}

export function SpotlightHero({ fallbackContent }: SpotlightHeroProps) {
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/spotlight/active', 'home_hero'],
    queryFn: async () => {
      const response = await fetch('/api/spotlight/active?route=/&slots=home_hero');
      if (!response.ok) throw new Error('Failed to fetch spotlight');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const spotlight: SpotlightData | null = data?.ok ? data.spotlights?.home_hero : null;

  // Track impression when component mounts and spotlight is active
  useEffect(() => {
    if (spotlight && !hasTrackedImpression) {
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
                placement: 'home_hero',
                kind: 'impression'
              })
            }).catch(console.error);

            setHasTrackedImpression(true);
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );

      const heroElement = document.getElementById('spotlight-hero');
      if (heroElement) {
        observer.observe(heroElement);
      }

      return () => observer.disconnect();
    }
  }, [spotlight, hasTrackedImpression]);

  const handleClick = () => {
    if (!spotlight) return;

    // Build redirector URL with encoded target and utm_content
    const redirectUrl = `/r/${spotlight.campaignId}?to=${encodeURIComponent(spotlight.click_url)}&utm_content=home_hero`;
    
    // Open in new tab with proper attributes
    window.open(redirectUrl, '_blank', 'noopener,noreferrer');
  };

  // Show fallback if no spotlight or loading/error
  if (isLoading || error || !spotlight) {
    return fallbackContent || null;
  }

  const bgImage = window.innerWidth >= 768 
    ? spotlight.creative?.image_desktop_url 
    : spotlight.creative?.image_mobile_url || spotlight.creative?.image_desktop_url;

  return (
    <div
      id="spotlight-hero"
      className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-orange-200/50"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: bgImage ? undefined : '#f97316'
      }}
      onClick={handleClick}
      data-testid="spotlight-hero"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {/* Sponsored badge */}
      {spotlight.is_sponsored && (
        <Badge 
          variant="secondary" 
          className="absolute top-4 left-4 bg-white/90 text-gray-900 border border-gray-200/50 backdrop-blur-sm"
          data-testid="sponsored-badge"
        >
          Sponsored
        </Badge>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16 max-w-4xl">
        {/* Sponsor name */}
        <div className="text-orange-400 font-medium text-sm md:text-base mb-2 tracking-wide">
          {spotlight.sponsor_name}
        </div>

        {/* Headline */}
        {spotlight.headline && (
          <h1 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 max-w-3xl">
            {spotlight.headline}
          </h1>
        )}

        {/* Subline */}
        {spotlight.subline && (
          <p className="text-white/90 text-lg md:text-xl lg:text-2xl leading-relaxed mb-8 max-w-2xl">
            {spotlight.subline}
          </p>
        )}

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <Button 
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg font-semibold transition-all duration-200 hover:scale-105 group"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            data-testid="spotlight-cta"
          >
            {spotlight.cta_text || 'Learn More'}
            <ExternalLink className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Logo if available */}
          {spotlight.creative?.logo_url && (
            <div className="hidden md:block">
              <img
                src={spotlight.creative.logo_url}
                alt={`${spotlight.sponsor_name} logo`}
                className="h-12 w-auto object-contain opacity-90"
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
  );
}