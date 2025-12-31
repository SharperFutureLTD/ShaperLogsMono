'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type GeneratedContent = Database['public']['Tables']['generated_content']['Row'];
type GeneratedContentInsert = Database['public']['Tables']['generated_content']['Insert'];

export const useGeneratedContent = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!user) {
      setContent([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('generated_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching generated content:', fetchError);
        setError(fetchError.message);
      } else {
        setContent(data || []);
      }
    } catch (err) {
      console.error('Error in fetchContent:', err);
      setError('Failed to fetch generated content');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Set up real-time subscription
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setContent((current) => [payload.new as GeneratedContent, ...current]);
          } else if (payload.eventType === 'DELETE') {
            setContent((current) =>
              current.filter((item) => item.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            setContent((current) =>
              current.map((item) =>
                item.id === payload.new.id ? (payload.new as GeneratedContent) : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const saveContent = async (data: Omit<GeneratedContentInsert, 'user_id'>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('generated_content')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error saving generated content:', insertError);
        setError(insertError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in saveContent:', err);
      setError('Failed to save generated content');
      return false;
    }
  };

  const deleteContent = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting generated content:', deleteError);
        setError(deleteError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteContent:', err);
      setError('Failed to delete generated content');
      return false;
    }
  };

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    saveContent,
    deleteContent,
  };
};
