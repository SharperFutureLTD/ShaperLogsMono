'use client'

import { Loader2 } from "lucide-react";
import { LogHistoryItem } from "./LogHistoryItem";
import type { Database } from "@/integrations/supabase/types";

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

interface LogHistoryProps {
  entries: WorkEntry[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
}

export function LogHistory({ entries, isLoading, onDelete }: LogHistoryProps) {
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

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <LogHistoryItem key={entry.id} entry={entry} onDelete={onDelete} />
      ))}
    </div>
  );
}
