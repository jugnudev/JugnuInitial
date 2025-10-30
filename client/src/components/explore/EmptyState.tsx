import { Plus, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: 'events' | 'places';
  hasFilters?: boolean;
  showSavedOnly?: boolean;
  onAddClick?: () => void;
}

export default function EmptyState({ type, hasFilters = false, showSavedOnly = false, onAddClick }: EmptyStateProps) {
  // Handle saved filter empty state
  if (showSavedOnly && type === 'events') {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-white/40" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">
              No saved events yet
            </h3>
            <p className="text-muted text-base">
              You haven't saved anything yet. Tap the ♥ on an event to save it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const config = type === 'events' ? {
    title: hasFilters ? "No events found" : "Nothing here yet",
    subtitle: hasFilters 
      ? "Try adjusting your filters or time range" 
      : "Be the first to add a South Asian event in Canada",
    actionText: "Add Event",
    actionHref: "/community/feature",
    icon: Search
  } : {
    title: hasFilters ? "No places found" : "Nothing here yet", 
    subtitle: hasFilters
      ? "Try different filters or search terms"
      : "Be the first to list a South Asian business in Canada",
    actionText: "List Your Place",
    actionHref: "/places/submit",
    icon: Search
  };

  const IconComponent = config.icon;

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center">
          <IconComponent className="w-10 h-10 text-white/40" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">
            {config.title}
          </h3>
          <p className="text-muted text-base">
            {config.subtitle}
          </p>
        </div>

        {/* Action */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasFilters && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Clear Filters
            </Button>
          )}
          
          <Button
            onClick={onAddClick || (() => window.open(config.actionHref, '_blank'))}
            className="bg-primary hover:bg-primary/90 text-black font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            {config.actionText}
          </Button>
        </div>
      </div>
    </div>
  );
}