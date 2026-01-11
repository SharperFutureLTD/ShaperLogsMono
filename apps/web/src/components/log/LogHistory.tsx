'use client'

import { useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { LogHistoryItem } from "./LogHistoryItem";
import type { Database } from "@/integrations/supabase/types";

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

interface LogHistoryProps {
  entries: WorkEntry[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  initialLimit?: number;
}

const DEFAULT_LIMIT = 3;

export function LogHistory({ entries, isLoading, onDelete, initialLimit = DEFAULT_LIMIT }: LogHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          No logs yet. Start by telling me what you did today.
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          <span className="cursor-blink">_</span>
        </p>
      </div>
    );
  }

  const displayedEntries = showAll ? entries : entries.slice(0, initialLimit);
  const hiddenCount = entries.length - initialLimit;
  const hasMore = entries.length > initialLimit;

  return (
    <div className="space-y-3">
      {displayedEntries.map((entry) => (
        <LogHistoryItem key={entry.id} entry={entry} onDelete={onDelete} />
      ))}

      {/* Show more / Show less button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[#1C2420]"
          style={{
            background: '#141A17',
            color: '#9CA898',
            border: '1px dashed #2A332E'
          }}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
          />
          {showAll ? 'Show less' : `View ${hiddenCount} more log${hiddenCount === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}
