import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from './useAuth';

export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface PeriodicSummary {
  id: string;
  user_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  summary_text: string;
  top_skills: string[];
  top_achievements: string[];
  key_metrics: Record<string, unknown>;
  categories_breakdown: Record<string, number>;
  work_entry_count: number;
  token_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing periodic work summaries (monthly, quarterly, yearly)
 * These summaries are used to reduce token usage for users with many entries
 */
export function usePeriodicSummaries(periodType?: PeriodType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to fetch all summaries
  const summariesQuery = useQuery({
    queryKey: ['periodic-summaries', periodType],
    queryFn: () => apiClient.getSummaries(periodType),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to generate a summary
  const generateMutation = useMutation({
    mutationFn: (params: { period_type: PeriodType; period_date?: string }) =>
      apiClient.generateSummary(params),
    onSuccess: () => {
      // Invalidate summaries query to refetch
      queryClient.invalidateQueries({ queryKey: ['periodic-summaries'] });
    },
  });

  // Mutation to delete a summary
  const deleteMutation = useMutation({
    mutationFn: (summaryId: string) => apiClient.deleteSummary(summaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodic-summaries'] });
    },
  });

  return {
    // Data
    summaries: summariesQuery.data?.data || [],

    // Loading states
    isLoading: summariesQuery.isLoading,
    isGenerating: generateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Error states
    error: summariesQuery.error,
    generateError: generateMutation.error,

    // Actions
    generateSummary: generateMutation.mutateAsync,
    deleteSummary: deleteMutation.mutateAsync,

    // Refetch
    refetch: summariesQuery.refetch,
  };
}

/**
 * Hook to fetch a specific summary by period and date
 */
export function usePeriodicSummary(period: PeriodType, date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['periodic-summary', period, date],
    queryFn: () => apiClient.getSummary(period, date),
    enabled: !!user && !!period && !!date,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404
  });
}

/**
 * Get summary statistics
 */
export function useSummaryStats() {
  const { summaries, isLoading } = usePeriodicSummaries();

  const stats = {
    monthly: summaries.filter((s) => s.period_type === 'monthly').length,
    quarterly: summaries.filter((s) => s.period_type === 'quarterly').length,
    yearly: summaries.filter((s) => s.period_type === 'yearly').length,
    totalEntries: summaries.reduce((sum, s) => sum + s.work_entry_count, 0),
    totalTokens: summaries.reduce((sum, s) => sum + s.token_count, 0),
  };

  return { stats, isLoading };
}
