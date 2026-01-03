'use client'

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type TargetDocument = Database['public']['Tables']['target_documents']['Row'];

interface APIExtractedTarget {
  title: string;
  description?: string;
  type: 'kpi' | 'ksb' | 'sales_target' | 'goal';
  target_value?: number;
}

// Import shared type
import type { ExtractedTarget } from '@/types/targets';

export const useTargetDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Extracted targets are temporary UI state, not server state
  const [extractedTargets, setExtractedTargets] = useState<ExtractedTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UPLOAD DOCUMENT MUTATION (uses REST API with PDF parsing)
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType?: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get JWT token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('file', file);
      if (documentType) {
        formData.append('documentType', documentType);
      }

      // Call REST API upload endpoint (handles PDF parsing + storage + database)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }

      const doc = await response.json();
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
      console.log('📥 Received from API:', response);
      if (response && response.targets) {
        console.log('🔄 Transforming', response.targets.length, 'targets');
        // Transform API response (title) to match ExtractedTarget type (name)
        const transformed: ExtractedTarget[] = response.targets.map((t: any) => ({
          name: t.title,
          description: t.description,
          type: t.type as ExtractedTarget['type'],
          target_value: t.target_value,
        }));
        console.log('✅ Transformed targets:', transformed);
        setExtractedTargets(transformed);
        console.log('✅ Set extracted targets state');
      } else {
        console.warn('⚠️ No targets in response');
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
