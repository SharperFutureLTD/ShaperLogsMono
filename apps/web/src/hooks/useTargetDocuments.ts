'use client'

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type TargetDocument = Database['public']['Tables']['target_documents']['Row'];

interface ExtractedTarget {
  title: string;
  description: string;
  type: 'kpi' | 'ksb' | 'sales_target' | 'goal';
  target_value?: number;
  current_value?: number;
  unit?: string;
}

export const useTargetDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Extracted targets are temporary UI state, not server state
  const [extractedTargets, setExtractedTargets] = useState<ExtractedTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UPLOAD DOCUMENT MUTATION
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType?: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('target-documents')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Insert document record in database
      const { data: doc, error: insertError } = await supabase
        .from('target_documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: data.path,
          document_type: documentType || 'targets',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return doc as TargetDocument;
    },

    onError: (err: Error) => {
      console.error('Error uploading document:', err);
      setError(err.message);
    },

    onSuccess: () => {
      setError(null);
    },
  });

  // EXTRACT TARGETS MUTATION
  const extractMutation = useMutation({
    mutationFn: (filePath: string) => apiClient.extractTargets(filePath),

    onSuccess: (response) => {
      if (response && response.targets) {
        setExtractedTargets(response.targets);
      }
      setError(null);
      // Invalidate targets cache as new targets may have been extracted
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });
    },

    onError: (err: Error) => {
      console.error('Error extracting targets:', err);
      setError(err.message || 'Failed to extract targets');
    },
  });

  // Backward-compatible wrappers
  const uploadDocument = useCallback(async (
    file: File,
    documentType?: string
  ): Promise<TargetDocument | null> => {
    try {
      const result = await uploadMutation.mutateAsync({ file, documentType });
      return result;
    } catch (err) {
      console.error('Error in uploadDocument:', err);
      return null;
    }
  }, [uploadMutation]);

  const parseAndExtractTargets = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      await extractMutation.mutateAsync(filePath);
      return true;
    } catch (err) {
      console.error('Error in parseAndExtractTargets:', err);
      return false;
    }
  }, [extractMutation]);

  const clearExtractedTargets = useCallback(() => {
    setExtractedTargets([]);
  }, []);

  // Return exact same interface
  return {
    uploading: uploadMutation.isPending,
    extracting: extractMutation.isPending,
    extractedTargets,
    error,
    uploadDocument,
    parseAndExtractTargets,
    clearExtractedTargets,
  };
};
