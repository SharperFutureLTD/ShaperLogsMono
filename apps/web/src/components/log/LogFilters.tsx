'use client'

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { DATE_RANGE_OPTIONS, type DateRangeFilter } from "@/lib/filters";

interface LogFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  categoryFilter: string[];
  onCategoryFilterChange: (categories: string[]) => void;
  availableCategories: string[];
}

export function LogFilters({
  dateRange,
  onDateRangeChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
}: LogFiltersProps) {
  const hasActiveFilters = dateRange !== 'all' || categoryFilter.length > 0;

  const toggleCategory = (category: string) => {
    onCategoryFilterChange(
      categoryFilter.includes(category)
        ? categoryFilter.filter(c => c !== category)
        : [...categoryFilter, category]
    );
  };

  const clearFilters = () => {
    onDateRangeChange('all');
    onCategoryFilterChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground font-mono py-1 mr-1">Time:</span>
        {DATE_RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => onDateRangeChange(option.value)}
            className={cn(
              "h-7 px-2 text-xs font-mono",
              dateRange === option.value && "bg-primary text-primary-foreground border-primary"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Category Filter */}
      {availableCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground font-mono py-1 mr-1">Category:</span>
          {availableCategories.map((category) => (
            <Button
              key={category}
              variant="outline"
              size="sm"
              onClick={() => toggleCategory(category)}
              className={cn(
                "h-7 px-2 text-xs font-mono",
                categoryFilter.includes(category) && "bg-primary text-primary-foreground border-primary"
              )}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-xs font-mono text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
