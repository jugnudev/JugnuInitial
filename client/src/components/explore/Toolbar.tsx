import { Search, Filter, X, Heart, Grid2X2, Grid3X3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SegmentedControl from "./SegmentedControl";

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  segmentOptions: readonly string[];
  segmentValue: string;
  onSegmentChange: (value: string) => void;
  onFiltersClick?: () => void;
  activeFiltersCount?: number;
  showSavedOnly?: boolean;
  onSavedToggle?: () => void;
  savedCount?: number;
  viewMode?: 'normal' | 'compact';
  onViewModeChange?: (mode: 'normal' | 'compact') => void;
  className?: string;
}

export default function Toolbar({
  searchValue,
  onSearchChange,
  segmentOptions,
  segmentValue,
  onSegmentChange,
  onFiltersClick,
  activeFiltersCount = 0,
  showSavedOnly = false,
  onSavedToggle,
  savedCount = 0,
  viewMode = 'normal',
  onViewModeChange,
  className = ""
}: ToolbarProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 sticky top-0 z-40 shadow-sm ${className}`}>
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-6">
        {/* Search */}
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-muted/70 rounded-2xl ring-inset ring-1 ring-white/10 focus:ring-2 focus:ring-primary/50"
            data-testid="search-input"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Control */}
        <SegmentedControl
          options={segmentOptions}
          value={segmentValue}
          onChange={onSegmentChange}
        />

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange(viewMode === 'normal' ? 'compact' : 'normal')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all"
            data-testid="view-mode-toggle"
            aria-label={`Switch to ${viewMode === 'normal' ? 'compact' : 'normal'} view`}
          >
            {viewMode === 'normal' ? (
              <Grid3X3 className="w-4 h-4" />
            ) : (
              <Grid2X2 className="w-4 h-4" />
            )}
            <span className="hidden lg:inline text-sm">
              {viewMode === 'normal' ? 'Compact' : 'Normal'}
            </span>
          </Button>
        )}

        {/* Saved Toggle */}
        {onSavedToggle && (
          <Button
            variant={showSavedOnly ? "default" : "ghost"}
            size="sm"
            onClick={onSavedToggle}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${
              showSavedOnly 
                ? 'bg-copper-500 hover:bg-copper-600 text-black border-copper-500' 
                : 'bg-white/5 hover:bg-white/10 border border-white/20 text-white'
            }`}
            data-testid="saved-toggle"
            aria-pressed={showSavedOnly}
            aria-label={`${showSavedOnly ? 'Hide' : 'Show'} saved events only`}
          >
            <Heart 
              className={`w-4 h-4 ${showSavedOnly ? 'fill-current' : 'fill-transparent'}`} 
            />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="bg-black/20 text-xs rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center font-medium">
                {savedCount}
              </span>
            )}
          </Button>
        )}

        {/* Filters Button - removed */}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-muted/70 rounded-2xl"
            data-testid="search-input-mobile"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filters - single row with horizontal scroll */}
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{WebkitOverflowScrolling: 'touch'}}>
            {segmentOptions.map((option) => (
              <button
                key={option}
                onClick={() => onSegmentChange(option)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex-shrink-0 ${
                  segmentValue === option
                    ? "bg-primary text-black"
                    : "bg-white/5 text-white/70 hover:text-white/90 hover:bg-white/10 border border-white/20"
                }`}
                data-testid={`mobile-filter-${option.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {option}
              </button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Saved Toggle */}
            {onSavedToggle && (
              <Button
                variant={showSavedOnly ? "default" : "ghost"}
                size="sm"
                onClick={onSavedToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${
                  showSavedOnly 
                    ? 'bg-copper-500 hover:bg-copper-600 text-black' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/20 text-white'
                }`}
                data-testid="saved-toggle-mobile"
                aria-pressed={showSavedOnly}
                aria-label={`${showSavedOnly ? 'Hide' : 'Show'} saved events only`}
              >
                <Heart 
                  className={`w-4 h-4 ${showSavedOnly ? 'fill-current' : 'fill-transparent'}`} 
                />
                <span className="text-sm">Saved</span>
                {savedCount > 0 && (
                  <span className="bg-black/20 text-xs rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center font-medium">
                    {savedCount}
                  </span>
                )}
              </Button>
            )}
            
            {/* Filters button removed */}
          </div>
        </div>
      </div>
    </div>
  );
}