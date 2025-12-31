'use client'

import { useMemo } from "react";
import { useLogConversation } from "@/hooks/useLogConversation";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { usePersistedState } from "@/hooks/usePersistedState";
import { filterByDateRange, type DateRangeFilter } from "@/lib/filters";
import { LogConversationBox } from "./LogConversationBox";
import { SummaryReview } from "./SummaryReview";
import { LogHistory } from "./LogHistory";
import { LogFilters } from "./LogFilters";
import { toast } from "sonner";

export function LogMode() {
  const {
    messages,
    status,
    exchangeCount,
    maxExchanges,
    summary,
    isLoading,
    sendMessage,
    updateSummary,
    acceptSummary,
    skipToSummary
  } = useLogConversation();

  const {
    entries,
    loading: isLoadingEntries,
    deleteEntry
  } = useWorkEntries();

  const [dateRange, setDateRange] = usePersistedState<DateRangeFilter>('log-date-filter', 'all');
  const [categoryFilter, setCategoryFilter] = usePersistedState<string[]>('log-category-filter', []);

  const filteredEntries = useMemo(() => {
    let result = filterByDateRange(entries, dateRange);
    if (categoryFilter.length > 0) {
      result = result.filter(e => e.category && categoryFilter.includes(e.category));
    }
    return result;
  }, [entries, dateRange, categoryFilter]);

  const availableCategories = useMemo(() => {
    const categories = entries
      .map(e => e.category)
      .filter((c): c is string => c !== null && c !== undefined);
    return [...new Set(categories)].sort();
  }, [entries]);

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const isReviewing = status === "review";

  return (
    <div className="space-y-6">
      {/* Unified conversation box */}
      <LogConversationBox
        messages={messages}
        exchangeCount={exchangeCount}
        maxExchanges={maxExchanges}
        isLoading={isLoading}
        status={status}
        onSubmit={sendMessage}
        onSkipToSummary={skipToSummary}
      />

      {/* Summary review */}
      {isReviewing && summary && (
        <SummaryReview
          summary={summary}
          isLoading={isLoading}
          onUpdate={updateSummary}
          onAccept={acceptSummary}
        />
      )}

      {/* History section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm text-muted-foreground">
            // log history
          </h3>
          {filteredEntries.length !== entries.length && entries.length > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {filteredEntries.length} of {entries.length}
            </span>
          )}
        </div>
        <LogFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          availableCategories={availableCategories}
        />
        <LogHistory
          entries={filteredEntries}
          isLoading={isLoadingEntries}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
