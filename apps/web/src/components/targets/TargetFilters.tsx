'use client'

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange('all');
    onStatusFilterChange('all');
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search targets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 font-mono text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground font-mono py-1 mr-1">Type:</span>
        {typeOptions.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => onTypeFilterChange(option.value)}
            className={cn(
              "h-7 px-2 text-xs font-mono",
              typeFilter === option.value && "bg-primary text-primary-foreground border-primary"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground font-mono py-1 mr-1">Status:</span>
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => onStatusFilterChange(option.value)}
            className={cn(
              "h-7 px-2 text-xs font-mono",
              statusFilter === option.value && "bg-primary text-primary-foreground border-primary"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

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
