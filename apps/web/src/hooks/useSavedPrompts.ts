'use client'

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';

export interface SavedPrompt {
  id: string;
  user_id: string;
  name: string;
  prompt_text: string;
  created_at: string;
  updated_at: string;
}

export const useSavedPrompts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch saved prompts via REST API
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: reactQueryRefetch
  } = useQuery({
    queryKey: queryKeys.savedPrompts.lists(),
    queryFn: () => apiClient.getSavedPrompts(),
    enabled: !!user,
    select: (response) => response.data as SavedPrompt[],
  });

  // CREATE MUTATION
  const createMutation = useMutation({
    mutationFn: (data: { name: string; prompt_text: string }) =>
      apiClient.createSavedPrompt(data),

    onMutate: async (newPrompt) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedPrompts.lists() });
      const previousData = queryClient.getQueryData(queryKeys.savedPrompts.lists());

      // Optimistic: add immediately
      queryClient.setQueryData(queryKeys.savedPrompts.lists(), (old: any) => {
        const optimisticPrompt: SavedPrompt = {
          id: `temp-${Date.now()}`,
          user_id: user!.id,
          name: newPrompt.name,
          prompt_text: newPrompt.prompt_text,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (!old) {
          return { data: [optimisticPrompt] };
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: [optimisticPrompt, ...old.data],
          };
        }

        if (Array.isArray(old)) {
          return [optimisticPrompt, ...old];
        }

        return old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error creating saved prompt:', err);
      queryClient.setQueryData(queryKeys.savedPrompts.lists(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedPrompts.all });
    },
  });

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteSavedPrompt(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedPrompts.lists() });
      const previousData = queryClient.getQueryData(queryKeys.savedPrompts.lists());

      // Optimistic: remove immediately
      queryClient.setQueryData(queryKeys.savedPrompts.lists(), (old: any) => {
        if (!old) return old;

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((item: SavedPrompt) => item.id !== id),
          };
        }

        if (Array.isArray(old)) {
          return old.filter((item: SavedPrompt) => item.id !== id);
        }

        return old;
      });

      return { previousData };
    },

    onError: (err, id, context) => {
      console.error('Error deleting saved prompt:', err);
      queryClient.setQueryData(queryKeys.savedPrompts.lists(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedPrompts.all });
    },
  });

  // Wrapper functions
  const createPrompt = useCallback(async (data: { name: string; prompt_text: string }): Promise<boolean> => {
    if (!user) return false;
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('Error in createPrompt:', err);
      return false;
    }
  }, [user, createMutation]);

  const deletePrompt = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in deletePrompt:', err);
      return false;
    }
  }, [deleteMutation]);

  const refetch = useCallback(async () => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  return {
    savedPrompts: data || [],
    loading,
    error: queryError?.message || null,
    refetch,
    createPrompt,
    deletePrompt,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
