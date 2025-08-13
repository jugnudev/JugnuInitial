import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, useFavoriteAnnouncement } from "@/stores/favorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  id: string;
  type: 'event' | 'place';
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

export default function FavoriteButton({ 
  id, 
  type, 
  name, 
  size = 'md', 
  variant = 'ghost',
  className 
}: FavoriteButtonProps) {
  const { 
    toggleEvent, 
    togglePlace, 
    isEventFavorited, 
    isPlaceFavorited 
  } = useFavorites();
  const { announce } = useFavoriteAnnouncement();
  
  const isFavorited = type === 'event' ? isEventFavorited(id) : isPlaceFavorited(id);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'event') {
      toggleEvent(id);
    } else {
      togglePlace(id);
    }
    
    // Announce for screen readers
    const action = isFavorited ? 'Removed from' : 'Saved to';
    const itemName = name || `${type} ${id}`;
    announce(`${action} Favorites: ${itemName}`);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggle}
      className={cn(
        sizeClasses[size],
        'transition-all duration-200 hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-copper-500 focus:ring-offset-2 focus:ring-offset-bg',
        isFavorited 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-white/70 hover:text-white',
        className
      )}
      aria-label={`${isFavorited ? 'Remove from' : 'Add to'} favorites${name ? `: ${name}` : ''}`}
      data-testid={`favorite-button-${type}-${id}`}
    >
      <Heart 
        className={cn(
          iconSizes[size],
          'transition-all duration-200',
          isFavorited ? 'fill-current' : 'fill-transparent'
        )} 
      />
    </Button>
  );
}