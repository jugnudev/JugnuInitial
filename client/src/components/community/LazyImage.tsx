import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  testId?: string;
}

/**
 * LazyImage component with intersection observer for performance
 * Loads images only when they're about to enter the viewport
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholderSrc = '/images/placeholder.svg',
  onLoad,
  onError,
  testId
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imageRef) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const img = new Image();
            img.src = src;
            
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
              onLoad?.();
            };
            
            img.onerror = () => {
              setHasError(true);
              setIsLoading(false);
              onError?.();
            };

            // Stop observing once we start loading
            observerRef.current?.disconnect();
          }
        });
      },
      {
        // Start loading when image is 100px before entering viewport
        rootMargin: '100px'
      }
    );

    observerRef.current.observe(imageRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [imageRef, src, onLoad, onError]);

  return (
    <div className={cn('relative overflow-hidden bg-gray-100', className)} data-testid={testId}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 w-full h-full" />
        </div>
      )}
      
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        loading="lazy"
        data-testid={`${testId}-img`}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}