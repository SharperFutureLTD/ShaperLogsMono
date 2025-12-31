'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

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
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedTargets, setExtractedTargets] = useState<ExtractedTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (file: File): Promise<string | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setUploading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('target-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading document:', uploadError);
        setError(uploadError.message);
        return null;
      }

      // Insert document record
      const { error: insertError } = await supabase
        .from('target_documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: data.path,
          file_type: file.type,
        });

      if (insertError) {
        console.error('Error inserting document record:', insertError);
        setError(insertError.message);
        return null;
      }

      return data.path;
    } catch (err) {
      console.error('Error in uploadDocument:', err);
      setError('Failed to upload document');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const parseAndExtractTargets = async (filePath: string): Promise<boolean> => {
    try {
      setExtracting(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke(
        'extract-targets',
        {
          body: { filePath },
        }
      );

      if (functionError) {
        console.error('Error calling extract-targets function:', functionError);
        setError(functionError.message);
        return false;
      }

      if (data && data.targets) {
        setExtractedTargets(data.targets);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in parseAndExtractTargets:', err);
      setError('Failed to extract targets');
      return false;
    } finally {
      setExtracting(false);
    }
  };

  const clearExtractedTargets = () => {
    setExtractedTargets([]);
  };

  return {
    uploading,
    extracting,
    extractedTargets,
    error,
    uploadDocument,
    parseAndExtractTargets,
    clearExtractedTargets,
  };
};
