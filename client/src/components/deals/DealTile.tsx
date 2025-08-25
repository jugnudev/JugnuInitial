import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface DealTileProps {
  title: string;
  subtitle: string;
  brand: string;
  code?: string;
  imgUrl?: string;
  alt?: string;
  href?: string;
  tileKind: 'wide' | 'half' | 'square' | 'tall';
  slot: number;
  isPlaceholder?: boolean;
}

// Aspect ratios for each tile kind
const aspectRatios = {
  wide: 'aspect-[4/1]',
  half: 'aspect-[2/1]',
  square: 'aspect-[1/1]',
  tall: 'aspect-[2/3]'
};

// Grid column spans for desktop
const gridSpans = {
  wide: 'col-span-12',
  half: 'col-span-6',
  square: 'col-span-6',
  tall: 'col-span-4'
};

// Gradient variations for placeholders
const placeholderGradients = [
  'from-orange-600 to-pink-600',
  'from-purple-600 to-blue-600',
  'from-teal-600 to-green-600',
  'from-rose-600 to-orange-600',
];

export function DealTile({ 
  title, 
  subtitle, 
  brand, 
  code, 
  imgUrl, 
  alt, 
  href, 
  tileKind, 
  slot,
  isPlaceholder = false 
}: DealTileProps) {
  const handleClick = () => {
    if (!href) return;
    
    // Add UTM parameters if not present
    let finalUrl = href;
    if (!href.includes('utm_source')) {
      const separator = href.includes('?') ? '&' : '?';
      finalUrl += `${separator}utm_source=jugnu&utm_medium=deals&utm_content=${tileKind}`;
    }
    
    window.open(finalUrl, '_blank', 'noopener,noreferrer,sponsored');
  };

  // Get gradient for placeholder based on slot
  const placeholderGradient = placeholderGradients[slot % placeholderGradients.length];

  const content = (
    <div
      className={`
        absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden group transition-all duration-300
        ${href ? 'cursor-pointer hover:shadow-xl hover:shadow-orange-200/30' : 'cursor-default'}
        bg-gradient-to-br from-gray-800 to-gray-900
      `}
      onClick={href ? handleClick : undefined}
      data-testid={`deal-tile-${slot}`}
    >
      {/* Background Image */}
      {imgUrl && !isPlaceholder && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${imgUrl})`,
          }}
        />
      )}
      {/* Gradient overlay */}
      <div className={`absolute inset-0 z-10 ${
        isPlaceholder 
          ? `bg-gradient-to-br ${placeholderGradient}` 
          : 'bg-gradient-to-r from-black/70 via-black/50 to-transparent'
      }`} />

      {/* Sponsored badge and brand */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-2 z-20">
        <Badge 
          variant="secondary" 
          className="bg-white/90 text-gray-900 border border-gray-200/50 backdrop-blur-sm text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5"
          data-testid={`deal-badge-${slot}`}
        >
          {isPlaceholder ? 'Jugnu' : 'Sponsored'}
        </Badge>
        {!isPlaceholder && brand && (
          <span className={`text-orange-400 font-medium tracking-wide text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none`}>
            {brand}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-6 z-20">
        <div className="flex-1 flex flex-col justify-end">
          {/* Title */}
          <h3 className="text-white font-bold leading-tight mb-1 text-sm sm:text-base md:text-lg lg:text-xl line-clamp-2">
            {title}
          </h3>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-white/90 leading-snug mb-2 sm:mb-3 text-xs sm:text-sm md:text-base line-clamp-2">
              {subtitle}
            </p>
          )}

          {/* Code if available */}
          {code && !isPlaceholder && (
            <div className="mb-2 sm:mb-3">
              <span className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1">
                <span className="text-white/70 text-[10px] sm:text-xs mr-1 sm:mr-2">Code:</span>
                <span className="text-white font-mono font-bold text-xs sm:text-sm">{code}</span>
              </span>
            </div>
          )}

          {/* CTA Button - only show if href exists */}
          {href && !isPlaceholder && (
            <div className="flex justify-start">
              <Button 
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 group/btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                data-testid={`deal-cta-${slot}`}
              >
                Shop Now
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return content;
}