'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Target = Database['public']['Tables']['targets']['Row'];
type TargetInsert = Database['public']['Tables']['targets']['Insert'];
type TargetUpdate = Database['public']['Tables']['targets']['Update'];

export const useTargets = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Target | null>(null);

  const fetchTargets = useCallback(async () => {
    if (!user) {
      setTargets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching targets:', fetchError);
        setError(fetchError.message);
      } else {
        setTargets(data || []);
      }
    } catch (err) {
      console.error('Error in fetchTargets:', err);
      setError('Failed to fetch targets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const createTarget = async (data: Omit<TargetInsert, 'user_id'>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('targets')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error creating target:', insertError);
        setError(insertError.message);
        return false;
      }

      await fetchTargets();
      return true;
    } catch (err) {
      console.error('Error in createTarget:', err);
      setError('Failed to create target');
      return false;
    }
  };

  const updateTarget = async (id: string, data: TargetUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('targets')
        .update(data)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating target:', updateError);
        setError(updateError.message);
        return false;
      }

      await fetchTargets();
      return true;
    } catch (err) {
      console.error('Error in updateTarget:', err);
      setError('Failed to update target');
      return false;
    }
  };

  const updateTargetProgress = async (
    id: string,
    currentValue: number,
    incrementBy: number = 1
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('targets')
        .update({ current_value: currentValue + incrementBy })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating target progress:', updateError);
        setError(updateError.message);
        return false;
      }

      await fetchTargets();
      return true;
    } catch (err) {
      console.error('Error in updateTargetProgress:', err);
      setError('Failed to update target progress');
      return false;
    }
  };

  const deleteTarget = async (id: string): Promise<boolean> => {
    try {
      // Find the target before soft deleting
      const target = targets.find((t) => t.id === id);
      if (target) {
        setRecentlyDeleted(target);
        setTimeout(() => setRecentlyDeleted(null), 5000); // Clear after 5 seconds
      }

      // Soft delete by setting is_active to false
      const { error: deleteError } = await supabase
        .from('targets')
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting target:', deleteError);
        setError(deleteError.message);
        return false;
      }

      await fetchTargets();
      return true;
    } catch (err) {
      console.error('Error in deleteTarget:', err);
      setError('Failed to delete target');
      return false;
    }
  };

  const restoreTarget = async (id: string): Promise<boolean> => {
    try {
      const { error: restoreError } = await supabase
        .from('targets')
        .update({ is_active: true })
        .eq('id', id);

      if (restoreError) {
        console.error('Error restoring target:', restoreError);
        setError(restoreError.message);
        return false;
      }

      setRecentlyDeleted(null);
      await fetchTargets();
      return true;
    } catch (err) {
      console.error('Error in restoreTarget:', err);
      setError('Failed to restore target');
      return false;
    }
  };

  return {
    targets,
    loading,
    error,
    recentlyDeleted,
    refetch: fetchTargets,
    createTarget,
    updateTarget,
    updateTargetProgress,
    deleteTarget,
    restoreTarget,
  };
};
