'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Target = Database['public']['Tables']['targets']['Row'];
type TargetInsert = Database['public']['Tables']['targets']['Insert'];
type TargetUpdate = Database['public']['Tables']['targets']['Update'];

export const useTargets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for undo functionality
  const [recentlyDeleted, setRecentlyDeleted] = useState<Target | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Set undo timeout
  const setUndoTimeout = (target: Target) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setRecentlyDeleted(target);
    undoTimeoutRef.current = setTimeout(() => {
      setRecentlyDeleted(null);
      undoTimeoutRef.current = null;
    }, 5000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Fetch targets via REST API (active only)
  const {
    data,
    isLoading,
    error: queryError,
    refetch: reactQueryRefetch
  } = useQuery({
    queryKey: queryKeys.targets.active(),
    queryFn: () => apiClient.getTargets(true), // is_active=true
    enabled: !!user,
    select: (response) => response.data,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('targets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'targets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // CREATE MUTATION
  const createMutation = useMutation({
    mutationFn: (data: Omit<TargetInsert, 'user_id'>) =>
      apiClient.createTarget(data),

    onMutate: async (newTarget) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets.active() });
      const previousData = queryClient.getQueryData(queryKeys.targets.active());

      // Optimistic: add immediately
      queryClient.setQueryData(queryKeys.targets.active(), (old: Target[] | undefined) => {
        const optimisticTarget: Target = {
          id: `temp-${Date.now()}`,
          user_id: user!.id,
          name: newTarget.name,
          description: newTarget.description || null,
          type: newTarget.type || 'goal',
          target_value: newTarget.target_value || null,
          current_value: newTarget.current_value || 0,
          unit: newTarget.unit || null,
          currency_code: newTarget.currency_code || 'GBP',
          deadline: newTarget.deadline || null,
          source_document_id: newTarget.source_document_id || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [optimisticTarget, ...(old || [])];
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error creating target:', err);
      queryClient.setQueryData(queryKeys.targets.active(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });

  // UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TargetUpdate }) =>
      apiClient.updateTarget(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets.active() });
      const previousData = queryClient.getQueryData(queryKeys.targets.active());

      queryClient.setQueryData(queryKeys.targets.active(), (old: Target[] | undefined) => {
        return old?.map(t =>
          t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
        ) || [];
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating target:', err);
      queryClient.setQueryData(queryKeys.targets.active(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });

  // PROGRESS MUTATION (SIMPLIFIED)
  const progressMutation = useMutation({
    mutationFn: ({ id, incrementBy }: { id: string; incrementBy?: number }) =>
      apiClient.incrementTargetProgress(id, incrementBy),

    onMutate: async ({ id, incrementBy = 1 }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets.active() });
      const previousData = queryClient.getQueryData(queryKeys.targets.active());

      queryClient.setQueryData(queryKeys.targets.active(), (old: Target[] | undefined) => {
        return old?.map(t =>
          t.id === id
            ? { ...t, current_value: (t.current_value || 0) + incrementBy, updated_at: new Date().toISOString() }
            : t
        ) || [];
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating progress:', err);
      queryClient.setQueryData(queryKeys.targets.active(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });

  // DELETE MUTATION (WITH UNDO)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.softDeleteTarget(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets.active() });
      const previousData = queryClient.getQueryData(queryKeys.targets.active());

      // Find target for undo
      const targetToDelete = (previousData as Target[] | undefined)?.find(t => t.id === id);

      if (targetToDelete) {
        setUndoTimeout(targetToDelete); // Start 5-second countdown
      }

      // Remove from cache
      queryClient.setQueryData(queryKeys.targets.active(), (old: Target[] | undefined) => {
        return old?.filter(t => t.id !== id) || [];
      });

      return { previousData };
    },

    onError: (err, id, context) => {
      console.error('Error deleting target:', err);
      queryClient.setQueryData(queryKeys.targets.active(), context?.previousData);
      setRecentlyDeleted(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });

  // RESTORE MUTATION
  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.restoreTarget(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets.active() });
      const previousData = queryClient.getQueryData(queryKeys.targets.active());

      // Add back to cache
      if (recentlyDeleted && recentlyDeleted.id === id) {
        queryClient.setQueryData(queryKeys.targets.active(), (old: Target[] | undefined) => {
          return [recentlyDeleted, ...(old || [])];
        });

        // Clear undo state
        setRecentlyDeleted(null);
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
          undoTimeoutRef.current = null;
        }
      }

      return { previousData };
    },

    onError: (err, id, context) => {
      console.error('Error restoring target:', err);
      queryClient.setQueryData(queryKeys.targets.active(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });

  // Backward-compatible wrappers
  const createTarget = useCallback(async (data: Omit<TargetInsert, 'user_id'>): Promise<boolean> => {
    if (!user) return false;
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('Error in createTarget:', err);
      return false;
    }
  }, [user, createMutation]);

  const updateTarget = useCallback(async (id: string, data: TargetUpdate): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch (err) {
      console.error('Error in updateTarget:', err);
      return false;
    }
  }, [updateMutation]);

  const updateTargetProgress = useCallback(async (
    id: string,
    _currentValue: number, // DEPRECATED - kept for compatibility
    incrementBy: number = 1
  ): Promise<boolean> => {
    try {
      await progressMutation.mutateAsync({ id, incrementBy });
      return true;
    } catch (err) {
      console.error('Error in updateTargetProgress:', err);
      return false;
    }
  }, [progressMutation]);

  const deleteTarget = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in deleteTarget:', err);
      return false;
    }
  }, [deleteMutation]);

  const restoreTarget = useCallback(async (id: string): Promise<boolean> => {
    try {
      await restoreMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error in restoreTarget:', err);
      return false;
    }
  }, [restoreMutation]);

  const refetch = useCallback(async () => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  // Return exact same interface
  return {
    targets: data || [],
    loading: isLoading,
    error: queryError?.message || null,
    recentlyDeleted,
    refetch,
    createTarget,
    updateTarget,
    updateTargetProgress,
    deleteTarget,
    restoreTarget,
  };
};
