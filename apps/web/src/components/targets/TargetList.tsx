'use client'

import { useState, useEffect } from "react";
import { TargetCard } from "./TargetCard";
import { TargetDetailSheet } from "./TargetDetailSheet";
import { Loader2, Target } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Target as TargetType } from "@/types/targets";

interface TargetListProps {
  targets: TargetType[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onUpdate?: (targetId: string, updates: Partial<TargetType>) => Promise<TargetType | null>;
}

export function TargetList({ targets, isLoading, onDelete, onUpdate }: TargetListProps) {
  const [selectedTarget, setSelectedTarget] = useState<TargetType | null>(null);
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({});

  // Fetch evidence counts for all targets
  useEffect(() => {
    async function fetchEvidenceCounts() {
      if (targets.length === 0) return;

      const targetIds = targets.map(t => t.id);

      const { data, error } = await supabase
        .from('work_entry_targets')
        .select('target_id')
        .in('target_id', targetIds);

      if (error) {
        console.error('Error fetching evidence counts:', error);
        return;
      }

      // Count occurrences of each target_id
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { target_id: string | null }) => {
        if (item.target_id) {
          counts[item.target_id] = (counts[item.target_id] || 0) + 1;
        }
      });

      setEvidenceCounts(counts);
    }

    fetchEvidenceCounts();
  }, [targets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">
          No targets yet
        </p>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Upload a document or add targets manually
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {targets.map((target) => (
          <TargetCard
            key={target.id}
            target={target}
            evidenceCount={evidenceCounts[target.id] || 0}
            onDelete={onDelete}
            onClick={() => setSelectedTarget(target)}
          />
        ))}
      </div>

      <TargetDetailSheet
        target={selectedTarget}
        open={!!selectedTarget}
        onOpenChange={(open) => !open && setSelectedTarget(null)}
        onUpdate={onUpdate}
        onTargetUpdated={(updatedTarget) => setSelectedTarget(updatedTarget)}
      />
    </>
  );
}
