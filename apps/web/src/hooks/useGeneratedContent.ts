'use client'

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type GeneratedContent = Database['public']['Tables']['generated_content']['Row'];
type GeneratedContentInsert = Database['public']['Tables']['generated_content']['Insert'];

export const useGeneratedContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch generated content via REST API
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: reactQueryRefetch
  } = useQuery({
    queryKey: queryKeys.generatedContent.lists(),
    queryFn: () => apiClient.getGeneratedContent(),
    enabled: !!user,
    select: (response) => response.data,
  });

  // Real-time subscription for cache invalidation
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('generated_content_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_content',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate cache on any change
          queryClient.invalidateQueries({ queryKey: queryKeys.generatedContent.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // SAVE MUTATION
  const saveMutation = useMutation({
    mutationFn: (data: Omit<GeneratedContentInsert, 'user_id'>) =>
      apiClient.saveGeneratedContent(data),

    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.generatedContent.lists() });
      const previousData = queryClient.getQueryData(queryKeys.generatedContent.lists());

      // Optimistic: add immediately
      queryClient.setQueryData(queryKeys.generatedContent.lists(), (old: any) => {
        const optimisticContent: GeneratedContent = {
          id: `temp-${Date.now()}`,
          user_id: user!.id,
          type: newContent.type,
          prompt: newContent.prompt,
          content: newContent.content,
          work_entry_ids: newContent.work_entry_ids || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Handle case where cache is empty or undefined
        if (!old) {
          return { data: [optimisticContent] };
        }

        // Handle standard API response structure { data: [...] }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: [optimisticContent, ...old.data],
          };
        }

        // Fallback if cache is just an array (legacy/unexpected state)
        if (Array.isArray(old)) {
          return [optimisticContent, ...old];
        }

        return old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error saving generated content:', err);
      queryClient.setQueryData(queryKeys.generatedContent.lists(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generatedContent.all });
    },
  });

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteGeneratedContent(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.generatedContent.lists() });
      const previousData = queryClient.getQueryData(queryKeys.generatedContent.lists());

      // Optimistic: remove immediately
      queryClient.setQueryData(queryKeys.generatedContent.lists(), (old: any) => {
        if (!old) return old;

        // Handle standard API response structure { data: [...] }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((item: GeneratedContent) => item.id !== id),
          };
        }

        // Fallback if cache is just an array
        if (Array.isArray(old)) {
          return old.filter((item: GeneratedContent) => item.id !== id);
        }

        return old;
      });

      return { previousData };
    },

    onError: (err, id, context) => {
      console.error('Error deleting generated content:', err);
      queryClient.setQueryData(queryKeys.generatedContent.lists(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generatedContent.all });
    },
  });

  // Backward-compatible wrappers
  const saveContent = useCallback(async (data: Omit<GeneratedContentInsert, 'user_id'>): Promise<boolean> => {
    if (!user) return false;
    try {
      await saveMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('Error in saveContent:', err);
      return false;
    }
  }, [user, saveMutation]);

  const deleteContent = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in deleteContent:', err);
      return false;
    }
  }, [deleteMutation]);

  const refetch = useCallback(async () => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  // Return exact same interface
  return {
    content: data || [],
    loading,
    error: queryError?.message || null,
    refetch,
    saveContent,
    deleteContent,
  };
};
