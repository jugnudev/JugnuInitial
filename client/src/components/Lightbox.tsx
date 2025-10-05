import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaItem {
  src: string;
  alt: string;
  type?: 'image' | 'video';
}

interface LightboxProps {
  images: MediaItem[];
  currentIndex: number;
  onClose: () => void;
}

export default function Lightbox({ images, currentIndex, onClose }: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [activeIndex, onClose]);

  const handleNext = () => {
    if (activeIndex < images.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const currentMedia = images[activeIndex];
  const isVideo = currentMedia?.type === 'video' || 
    currentMedia?.src?.includes('.mp4') || 
    currentMedia?.src?.includes('.webm') || 
    currentMedia?.src?.includes('video');

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <div className="relative w-full h-full max-w-7xl max-h-screen flex items-center justify-center">
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-20 text-white hover:text-accent hover:bg-white/10 rounded-full"
          data-testid="lightbox-close"
          aria-label="Close lightbox"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Previous Button */}
        {images.length > 1 && activeIndex > 0 && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            variant="ghost"
            size="icon"
            className="absolute left-4 z-20 text-white hover:text-accent hover:bg-white/10 rounded-full"
            data-testid="lightbox-previous"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Next Button */}
        {images.length > 1 && activeIndex < images.length - 1 && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            variant="ghost"
            size="icon"
            className="absolute right-4 z-20 text-white hover:text-accent hover:bg-white/10 rounded-full"
            data-testid="lightbox-next"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Media Content */}
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              <video
                src={currentMedia.src}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] object-contain"
                data-testid="lightbox-video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <img
              src={currentMedia.src}
              alt={currentMedia.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              data-testid="lightbox-image"
            />
          )}
        </div>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium">
            {activeIndex + 1} / {images.length}
          </div>
        )}

        {/* Image Alt Text / Caption */}
        {currentMedia?.alt && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-2xl bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-lg text-center">
            <p className="text-sm">{currentMedia.alt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
