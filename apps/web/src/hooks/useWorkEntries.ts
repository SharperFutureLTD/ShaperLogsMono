'use client'

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

/**
 * useWorkEntries - Fetch and manage work entries via REST API
 *
 * NOTE: Work entry creation is handled by useLogConversation.ts
 * After creating entries, that hook must invalidate the cache:
 *
 * queryClient.invalidateQueries({ queryKey: queryKeys.workEntries.all });
 *
 * Real-time updates: Uses Supabase subscription + React Query cache invalidation
 * for immediate updates without polling delays.
 *
 * @see useLogConversation.ts - acceptSummary() function
 */
export const useWorkEntries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch work entries via REST API
  const {
    data,
    isLoading,
    error: queryError,
    refetch: reactQueryRefetch
  } = useQuery({
    queryKey: queryKeys.workEntries.lists(),
    queryFn: () => apiClient.getWorkEntries(),
    enabled: !!user, // Only fetch if user is authenticated
    select: (response) => response.entries, // Extract entries array
  });

  // Real-time Supabase subscription (preserve existing behavior)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('work_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // On any database change, invalidate React Query cache
          // This triggers a refetch from the REST API
          queryClient.invalidateQueries({ queryKey: queryKeys.workEntries.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Delete mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteWorkEntry(id),

    // Optimistic update - remove entry immediately from cache
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.workEntries.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKeys.workEntries.lists());

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.workEntries.lists(), (old: WorkEntry[] | undefined) => {
        return old?.filter((entry) => entry.id !== id) || [];
      });

      // Return context for rollback
      return { previousData };
    },

    // Rollback on error
    onError: (err, id, context) => {
      console.error('Error deleting work entry:', err);
      queryClient.setQueryData(queryKeys.workEntries.lists(), context?.previousData);
    },

    // Refetch to ensure consistency (real-time subscription will also trigger this)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workEntries.all });
    },
  });

  // Backward-compatible deleteEntry function
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in deleteEntry:', err);
      return false;
    }
  }, [deleteMutation]);

  // Backward-compatible refetch function
  const refetch = useCallback(async (): Promise<void> => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  // Backward-compatible return interface
  return {
    entries: data || [],
    loading: isLoading,
    error: queryError?.message || null,
    refetch,
    deleteEntry,
  };
};
