'use client'

import { Search } from "lucide-react";

export type TargetTypeFilter = 'all' | 'kpi' | 'ksb' | 'sales_target' | 'goal';
export type TargetStatusFilter = 'all' | 'on_track' | 'overdue' | 'completed';

interface TargetFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: TargetTypeFilter;
  onTypeFilterChange: (type: TargetTypeFilter) => void;
  statusFilter: TargetStatusFilter;
  onStatusFilterChange: (status: TargetStatusFilter) => void;
}

const typeOptions: { value: TargetTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'kpi', label: 'KPI' },
  { value: 'ksb', label: 'KSB' },
  { value: 'sales_target', label: 'Sales' },
  { value: 'goal', label: 'Goal' },
];

const statusOptions: { value: TargetStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on_track', label: 'On Track' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

export function TargetFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: TargetFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: '#5C6660' }}
        />
        <input
          type="text"
          placeholder="Search targets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onTypeFilterChange(option.value)}
            className={`filter-pill ${typeFilter === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusFilterChange(option.value)}
            className={`filter-pill ${statusFilter === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
