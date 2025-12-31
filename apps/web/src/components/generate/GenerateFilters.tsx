'use client'

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { DATE_RANGE_OPTIONS, type DateRangeFilter } from "@/lib/filters";
import { GENERATE_TYPE_OPTIONS } from "@/types/generate";

interface GenerateFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  availableTypes: string[];
}

export function GenerateFilters({
  dateRange,
  onDateRangeChange,
  typeFilter,
  onTypeFilterChange,
  availableTypes,
}: GenerateFiltersProps) {
  const hasActiveFilters = dateRange !== 'all' || typeFilter.length > 0;

  const toggleType = (type: string) => {
    onTypeFilterChange(
      typeFilter.includes(type)
        ? typeFilter.filter(t => t !== type)
        : [...typeFilter, type]
    );
  };

  const clearFilters = () => {
    onDateRangeChange('all');
    onTypeFilterChange([]);
  };

  const getTypeLabel = (type: string) => {
    const option = GENERATE_TYPE_OPTIONS.find(o => o.type === type);
    return option?.label || type;
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

      {/* Type Filter */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground font-mono py-1 mr-1">Type:</span>
          {availableTypes.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => toggleType(type)}
              className={cn(
                "h-7 px-2 text-xs font-mono",
                typeFilter.includes(type) && "bg-primary text-primary-foreground border-primary"
              )}
            >
              {getTypeLabel(type)}
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
