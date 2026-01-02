'use client'

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useWorkEntries } from '@/hooks/useWorkEntries';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useProfile } from '@/hooks/useProfile';
import { GenerateType } from '@/types/generate';
import { toast } from 'sonner';

interface GenerateState {
  isGenerating: boolean;
  generatedContent: string | null;
  selectedType: GenerateType;
  prompt: string;
}

export function useGenerateConversation() {
  const { entries: workEntries } = useWorkEntries();
  const { saveContent } = useGeneratedContent();
  const { profile } = useProfile();

  const [state, setState] = useState<GenerateState>({
    isGenerating: false,
    generatedContent: null,
    selectedType: 'custom',
    prompt: '',
  });

  // GENERATE CONTENT MUTATION (migrated from Edge Function to REST API)
  const generateMutation = useMutation({
    mutationFn: async (promptToUse: string) => {
      // Prepare work entries for context, sorted by date (newest first)
      const entriesForContext = [...workEntries]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(entry => ({
          redacted_summary: entry.redacted_summary,
          skills: entry.skills || [],
          achievements: entry.achievements || [],
          metrics: entry.metrics || {},
          category: entry.category || 'general',
          created_at: entry.created_at,
        }));

      // Call REST API instead of Edge Function
      const response = await apiClient.generateContent({
        prompt: promptToUse,
        type: state.selectedType,
        workEntries: entriesForContext,
        industry: profile?.industry || 'general',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.content;
    },

    onMutate: () => {
      setState(prev => ({ ...prev, isGenerating: true, generatedContent: null }));
    },

    onSuccess: (content) => {
      setState(prev => ({ ...prev, generatedContent: content, isGenerating: false }));
    },

    onError: (error: Error) => {
      console.error('Error generating content:', error);
      const errorMessage = error.message || 'Failed to generate content';
      toast.error(errorMessage);
      setState(prev => ({ ...prev, isGenerating: false }));
    },
  });

  const setSelectedType = useCallback((type: GenerateType) => {
    setState(prev => ({ ...prev, selectedType: type }));
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  }, []);

  const generate = useCallback(async (customPrompt?: string): Promise<string | null> => {
    const promptToUse = customPrompt || state.prompt;

    if (!promptToUse.trim()) {
      toast.error('Please enter a prompt');
      return null;
    }

    try {
      const content = await generateMutation.mutateAsync(promptToUse);
      return content;
    } catch (error) {
      return null;
    }
  }, [state.prompt, generateMutation]);

  const save = useCallback(async () => {
    if (!state.generatedContent) {
      toast.error('No content to save');
      return null;
    }

    try {
      const workEntryIds = workEntries.map(e => e.id);
      const saved = await saveContent({
        type: state.selectedType,
        prompt: state.prompt,
        content: state.generatedContent,
        work_entry_ids: workEntryIds
      });

      toast.success('Content saved!');

      // Reset state after saving
      setState({
        isGenerating: false,
        generatedContent: null,
        selectedType: 'custom',
        prompt: '',
      });

      return saved;
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
      return null;
    }
  }, [state.generatedContent, state.selectedType, state.prompt, workEntries, saveContent]);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      generatedContent: null,
      selectedType: 'custom',
      prompt: '',
    });
  }, []);

  // Return exact same interface
  return {
    ...state,
    workEntriesCount: workEntries.length,
    setSelectedType,
    setPrompt,
    generate,
    save,
    reset,
  };
}
