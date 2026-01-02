'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
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
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedTargets, setExtractedTargets] = useState<ExtractedTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (file: File, documentType?: string): Promise<TargetDocument | null> => {
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
        console.error('Error inserting document record:', insertError);
        setError(insertError.message);
        return null;
      }

      return doc as TargetDocument;
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

      // Get current session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError('Not authenticated');
        return false;
      }

      // Call REST API with correct parameter
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/extract-targets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error calling extract-targets API:', errorData);
        setError(errorData.message || 'Failed to extract targets');
        return false;
      }

      const data = await response.json();

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
