'use client'

import { type DateRangeFilter } from "@/lib/filters";

interface LogFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  categoryFilter: string[];
  onCategoryFilterChange: (categories: string[]) => void;
  availableCategories: string[];
}

const DATE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'all', label: 'All' },
];

export function LogFilters({
  dateRange,
  onDateRangeChange,
}: LogFiltersProps) {
  return (
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
  );
}
