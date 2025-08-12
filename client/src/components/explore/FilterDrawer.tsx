import { useEffect, useState } from "react";
import { X, Calendar, MapPin, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNeighborhoods, getPriceLevels, getCommonPlaceTags, getCommonEventTags } from "@/lib/taxonomy";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'events' | 'places';
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

export default function FilterDrawer({ isOpen, onClose, type, filters, onFiltersChange }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNeighborhoodToggle = (neighborhood: string, checked: boolean) => {
    const current = localFilters.neighborhoods || [];
    const updated = checked 
      ? [...current, neighborhood]
      : current.filter((n: string) => n !== neighborhood);
    setLocalFilters(prev => ({ ...prev, neighborhoods: updated }));
  };

  const handleTagToggle = (tag: string, checked: boolean) => {
    const current = localFilters.tags || [];
    const updated = checked 
      ? [...current, tag]
      : current.filter((t: string) => t !== tag);
    setLocalFilters(prev => ({ ...prev, tags: updated }));
  };

  const handlePriceLevelToggle = (level: number, checked: boolean) => {
    const current = localFilters.priceLevels || [];
    const updated = checked 
      ? [...current, level]
      : current.filter((l: number) => l !== level);
    setLocalFilters(prev => ({ ...prev, priceLevels: updated }));
  };

  const handleClearAll = () => {
    const cleared = type === 'events' 
      ? { range: 'month' }
      : {};
    setLocalFilters(cleared);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.neighborhoods?.length) count += localFilters.neighborhoods.length;
    if (localFilters.tags?.length) count += localFilters.tags.length;
    if (localFilters.priceLevels?.length) count += localFilters.priceLevels.length;
    if (type === 'events' && localFilters.range && localFilters.range !== 'month') count += 1;
    return count;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Mobile: Full screen */}
      <div className="lg:hidden h-full flex flex-col bg-bg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
            data-testid="close-filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Events: Date Range */}
          {type === 'events' && (
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Time Range
              </h3>
              <Select value={localFilters.range || 'month'} onValueChange={(value) => setLocalFilters(prev => ({ ...prev, range: value }))}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Places: Price Level */}
          {type === 'places' && (
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Price Range
              </h3>
              <div className="space-y-2">
                {getPriceLevels().map((priceLevel) => (
                  <div key={priceLevel.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`price-${priceLevel.value}`}
                      checked={localFilters.priceLevels?.includes(priceLevel.value) || false}
                      onCheckedChange={(checked) => handlePriceLevelToggle(priceLevel.value, checked as boolean)}
                    />
                    <label htmlFor={`price-${priceLevel.value}`} className="text-sm text-white cursor-pointer">
                      {priceLevel.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Neighborhoods */}
          <div className="space-y-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Areas
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getNeighborhoods().map((neighborhood) => (
                <div key={neighborhood} className="flex items-center space-x-2">
                  <Checkbox
                    id={`neighborhood-${neighborhood}`}
                    checked={localFilters.neighborhoods?.includes(neighborhood) || false}
                    onCheckedChange={(checked) => handleNeighborhoodToggle(neighborhood, checked as boolean)}
                  />
                  <label htmlFor={`neighborhood-${neighborhood}`} className="text-sm text-white cursor-pointer">
                    {neighborhood}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Specialties
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(type === 'places' ? getCommonPlaceTags() : getCommonEventTags()).map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={localFilters.tags?.includes(tag) || false}
                    onCheckedChange={(checked) => handleTagToggle(tag, checked as boolean)}
                  />
                  <label htmlFor={`tag-${tag}`} className="text-sm text-white cursor-pointer capitalize">
                    {tag.replace(/-/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              data-testid="clear-filters"
            >
              Clear All
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-primary hover:bg-primary/90 text-black font-medium"
              data-testid="apply-filters"
            >
              Apply {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: Slide-over */}
      <div className="hidden lg:flex justify-end">
        <div className="w-full max-w-md h-full bg-bg border-l border-white/10 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
              data-testid="close-filters-desktop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Events: Date Range */}
            {type === 'events' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Time Range
                </h3>
                <Select value={localFilters.range || 'month'} onValueChange={(value) => setLocalFilters(prev => ({ ...prev, range: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Places: Price Level */}
            {type === 'places' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price Range
                </h3>
                <div className="space-y-3">
                  {getPriceLevels().map((priceLevel) => (
                    <div key={priceLevel.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`price-desktop-${priceLevel.value}`}
                        checked={localFilters.priceLevels?.includes(priceLevel.value) || false}
                        onCheckedChange={(checked) => handlePriceLevelToggle(priceLevel.value, checked as boolean)}
                      />
                      <label htmlFor={`price-desktop-${priceLevel.value}`} className="text-sm text-white cursor-pointer">
                        {priceLevel.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhoods */}
            <div className="space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Areas
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {getNeighborhoods().map((neighborhood) => (
                  <div key={neighborhood} className="flex items-center space-x-2">
                    <Checkbox
                      id={`neighborhood-desktop-${neighborhood}`}
                      checked={localFilters.neighborhoods?.includes(neighborhood) || false}
                      onCheckedChange={(checked) => handleNeighborhoodToggle(neighborhood, checked as boolean)}
                    />
                    <label htmlFor={`neighborhood-desktop-${neighborhood}`} className="text-sm text-white cursor-pointer">
                      {neighborhood}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Specialties
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(type === 'places' ? getCommonPlaceTags() : getCommonEventTags()).map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-desktop-${tag}`}
                      checked={localFilters.tags?.includes(tag) || false}
                      onCheckedChange={(checked) => handleTagToggle(tag, checked as boolean)}
                    />
                    <label htmlFor={`tag-desktop-${tag}`} className="text-sm text-white cursor-pointer capitalize">
                      {tag.replace(/-/g, ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 space-y-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                data-testid="clear-filters-desktop"
              >
                Clear All
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-primary hover:bg-primary/90 text-black font-medium"
                data-testid="apply-filters-desktop"
              >
                Apply {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}