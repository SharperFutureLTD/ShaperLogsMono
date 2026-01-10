'use client'

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLogConversation } from "@/hooks/useLogConversation";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useAuth } from "@/hooks/useAuth";
import { filterByDateRange, type DateRangeFilter } from "@/lib/filters";
import { LogConversationBox } from "./LogConversationBox";
import { SummaryReview } from "./SummaryReview";
import { LogHistory } from "./LogHistory";
import { LogFilters } from "./LogFilters";
import { toast } from "sonner";

export function LogMode() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    messages,
    status,
    exchangeCount,
    maxExchanges,
    summary,
    isLoading,
    summaryError,
    sendMessage,
    updateSummary,
    updateTargetMappings,
    acceptSummary,
    skipToSummary,
    retrySummary,
    resetConversation,
    undoLastExchange
  } = useLogConversation();

  const {
    entries,
    loading: isLoadingEntries,
    deleteEntry
  } = useWorkEntries();

  const [dateRange, setDateRange] = usePersistedState<DateRangeFilter>('log-date-filter', 'all', user?.id);
  const [categoryFilter, setCategoryFilter] = usePersistedState<string[]>('log-category-filter', [], user?.id);

  const filteredEntries = useMemo(() => {
    let result = filterByDateRange(entries, dateRange);
    if (categoryFilter.length > 0) {
      result = result.filter(e => e.category && categoryFilter.includes(e.category));
    }
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.redacted_summary?.toLowerCase().includes(query) ||
        e.skills?.some(s => s.toLowerCase().includes(query)) ||
        e.achievements?.some(a => a.toLowerCase().includes(query))
      );
    }
    return result;
  }, [entries, dateRange, categoryFilter, searchQuery]);

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
        summaryError={summaryError}
        onSubmit={sendMessage}
        onSkipToSummary={skipToSummary}
        onRetry={retrySummary}
        onClear={resetConversation}
        onUndo={undoLastExchange}
      />

      {/* Summary review */}
      {isReviewing && summary && (
        <SummaryReview
          summary={summary}
          isLoading={isLoading}
          onUpdate={updateSummary}
          onUpdateTargetMappings={updateTargetMappings}
          onAccept={acceptSummary}
        />
      )}

      {/* History section */}
      <div className="space-y-4">
        {/* Section header */}
        <h3 className="section-title">Recent Logs</h3>

        {/* Search input */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: '#5C6660' }}
          />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filters */}
        <LogFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          availableCategories={availableCategories}
        />

        {/* History list */}
        <LogHistory
          entries={filteredEntries}
          isLoading={isLoadingEntries}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
