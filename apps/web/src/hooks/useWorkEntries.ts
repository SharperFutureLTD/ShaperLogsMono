'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

/**
 * useWorkEntries - Fetch and manage work entries via REST API
 * Supports infinite scrolling/pagination.
 */
export const useWorkEntries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Infinite query for pagination
  const {
    data,
    isLoading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: reactQueryRefetch
  } = useInfiniteQuery({
    queryKey: queryKeys.workEntries.lists(),
    queryFn: ({ pageParam = 1 }) => apiClient.getWorkEntries(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta && lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!user,
  });

  // Flatten pages into a single array for backward compatibility
  const entries = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page?.entries || []) || [];
  }, [data]);

  // Real-time Supabase subscription
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
          // Invalidate cache to trigger refetch
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

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workEntries.lists() });
      const previousData = queryClient.getQueryData(queryKeys.workEntries.lists());

      // Optimistic update for infinite query structure
      queryClient.setQueryData(queryKeys.workEntries.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            entries: page.entries.filter((entry: WorkEntry) => entry.id !== id),
          })),
        };
      });

      return { previousData };
    },

    onError: (err, id, context) => {
      console.error('Error deleting work entry:', err);
      queryClient.setQueryData(queryKeys.workEntries.lists(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workEntries.all });
    },
  });

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in deleteEntry:', err);
      return false;
    }
  }, [deleteMutation]);

  const refetch = useCallback(async (): Promise<void> => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  return {
    entries,
    loading: isLoading,
    error: queryError?.message || null,
    refetch,
    deleteEntry,
    // Pagination controls
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
