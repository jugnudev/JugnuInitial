import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import SegmentedControl from "./SegmentedControl";

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  segmentOptions: readonly string[];
  segmentValue: string;
  onSegmentChange: (value: string) => void;
  onFiltersClick: () => void;
  activeFiltersCount?: number;
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

        {/* Filters Button */}
        <button
          onClick={onFiltersClick}
          className="relative inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-2xl transition-colors"
          data-testid="filters-button"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {activeFiltersCount}
            </span>
          )}
        </button>
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

        {/* Segmented Control + Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 overflow-x-auto">
            <SegmentedControl
              options={segmentOptions}
              value={segmentValue}
              onChange={onSegmentChange}
              className="min-w-max"
            />
          </div>
          
          <button
            onClick={onFiltersClick}
            className="relative flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-2xl transition-colors shrink-0"
            data-testid="filters-button-mobile"
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}