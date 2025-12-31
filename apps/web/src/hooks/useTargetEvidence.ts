'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface SmartData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface TargetEvidence {
  id: string;
  work_entry_id: string;
  contribution_value: number | null;
  contribution_note: string | null;
  smart_data: SmartData | null;
  created_at: string;
  work_entry: {
    id: string;
    redacted_summary: string;
    category: string | null;
    created_at: string;
  };
}

export const useTargetEvidence = (targetId: string | null) => {
  const [evidence, setEvidence] = useState<TargetEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvidence = useCallback(async () => {
    if (!targetId) {
      setEvidence([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch work_entry_targets with joined work_entries
      const { data, error: fetchError } = await supabase
        .from('work_entry_targets')
        .select(`
          id,
          work_entry_id,
          contribution_value,
          contribution_note,
          smart_data,
          created_at,
          work_entries!inner(
            id,
            redacted_summary,
            category,
            created_at
          )
        `)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform the data to flatten the work_entry
      const transformedData: TargetEvidence[] = (data || []).map((item: any) => ({
        id: item.id,
        work_entry_id: item.work_entry_id,
        contribution_value: item.contribution_value,
        contribution_note: item.contribution_note,
        smart_data: item.smart_data as SmartData | null,
        created_at: item.created_at,
        work_entry: {
          id: item.work_entries.id,
          redacted_summary: item.work_entries.redacted_summary,
          category: item.work_entries.category,
          created_at: item.work_entries.created_at,
        },
      }));

      setEvidence(transformedData);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching target evidence:', err);
    } finally {
      setIsLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  return {
    evidence,
    isLoading,
    error,
  };
};
