'use client'

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';

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
  // Fetch target evidence via REST API (API handles the complex join query)
  const {
    data,
    isLoading,
    error: queryError
  } = useQuery({
    queryKey: queryKeys.targets.evidence(targetId || ''),
    queryFn: () => apiClient.getTargetEvidence(targetId!),
    enabled: !!targetId,
    select: (response) => response.data,
  });

  // Return exact same interface
  return {
    evidence: data || [],
    isLoading,
    error: queryError || null,
  };
};
