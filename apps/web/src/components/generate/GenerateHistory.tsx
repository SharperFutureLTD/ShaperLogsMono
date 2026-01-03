'use client'

import { useMemo } from 'react';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useAuth } from '@/hooks/useAuth';
import { filterByDateRange, type DateRangeFilter } from '@/lib/filters';
import { GenerateHistoryItem } from './GenerateHistoryItem';
import { GenerateFilters } from './GenerateFilters';
import { toast } from 'sonner';

export function GenerateHistory() {
  const { user } = useAuth();
  const { content, isLoading, deleteContent } = useGeneratedContent();
  const [dateRange, setDateRange] = usePersistedState<DateRangeFilter>('generate-date-filter', 'all', user?.id);
  const [typeFilter, setTypeFilter] = usePersistedState<string[]>('generate-type-filter', [], user?.id);

  const handleDelete = async (id: string) => {
    try {
      await deleteContent(id);
      toast.success('Content deleted');
    } catch {
      toast.error('Failed to delete content');
    }
  };

  const filteredContent = useMemo(() => {
    let result = filterByDateRange(content, dateRange);

    if (typeFilter.length > 0) {
      result = result.filter(c => typeFilter.includes(c.type));
    }

    return result;
  }, [content, dateRange, typeFilter]);

  const availableTypes = useMemo(() => {
    const types = content.map(c => c.type);
    return [...new Set(types)].sort();
  }, [content]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-mono text-sm text-muted-foreground">
          // generation history
        </h3>
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-mono text-sm text-muted-foreground">
          // generation history
        </h3>
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            No generated content yet. Create something above!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm text-muted-foreground">
          // generation history
        </h3>
        {filteredContent.length !== content.length && content.length > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {filteredContent.length} of {content.length}
          </span>
        )}
      </div>

      <GenerateFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        availableTypes={availableTypes}
      />

      {filteredContent.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            No content matches your filters.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Try adjusting your filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContent.map((item) => (
            <GenerateHistoryItem
              key={item.id}
              item={item}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
