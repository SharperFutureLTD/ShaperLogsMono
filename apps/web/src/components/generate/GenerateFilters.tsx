'use client'

import { type DateRangeFilter } from "@/lib/filters";
import { GENERATE_TYPE_OPTIONS } from "@/types/generate";

interface GenerateFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  availableTypes: string[];
}

const DATE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
];

export function GenerateFilters({
  dateRange,
  onDateRangeChange,
  typeFilter,
  onTypeFilterChange,
  availableTypes,
}: GenerateFiltersProps) {
  const toggleType = (type: string) => {
    onTypeFilterChange(
      typeFilter.includes(type)
        ? typeFilter.filter(t => t !== type)
        : [...typeFilter, type]
    );
  };

  const getTypeLabel = (type: string) => {
    const option = GENERATE_TYPE_OPTIONS.find(o => o.type === type);
    return option?.label || type;
  };

  return (
    <div className="space-y-3">
      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-2">
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onDateRangeChange(option.value)}
            className={`filter-pill ${dateRange === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTypeFilterChange([])}
            className={`filter-pill ${typeFilter.length === 0 ? 'active' : ''}`}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`filter-pill ${typeFilter.includes(type) ? 'active' : ''}`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
