import { useEffect } from "react";

interface LightboxProps {
  image: { src: string; alt: string };
  onClose: () => void;
}

export default function Lightbox({ image, onClose }: LightboxProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-accent text-2xl z-10"
          data-testid="lightbox-close"
          aria-label="Close lightbox"
        >
          <i className="fas fa-times"></i>
        </button>
        <img
          src={image.src}
          alt={image.alt}
          className="max-w-full max-h-full object-contain rounded-xl"
          data-testid="lightbox-image"
        />
      </div>
    </div>
  );
}
