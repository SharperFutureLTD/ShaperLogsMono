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
  selectedType: GenerateType | null;
  prompt: string;
  contextDocument: string | null;
}

export function useGenerateConversation() {
  const { entries: workEntries } = useWorkEntries();
  const { saveContent } = useGeneratedContent();
  const { profile } = useProfile();

  const [state, setState] = useState<GenerateState>({
    isGenerating: false,
    generatedContent: null,
    selectedType: null,
    prompt: '',
    contextDocument: null,
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
        type: state.selectedType!, // Validated before mutation is called
        workEntries: entriesForContext,
        industry: profile?.industry || 'general',
        contextDocument: state.contextDocument || undefined,
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

  const setSelectedType = useCallback((type: GenerateType | null) => {
    setState(prev => ({ ...prev, selectedType: type }));
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  }, []);

  const setContextDocument = useCallback((content: string | null) => {
    setState(prev => ({ ...prev, contextDocument: content }));
  }, []);

  const generate = useCallback(async (customPrompt?: string): Promise<string | null> => {
    const promptToUse = customPrompt || state.prompt;

    if (!promptToUse.trim()) {
      toast.error('Please enter a prompt');
      return null;
    }

    if (!state.selectedType) {
      toast.error('Please select a content type');
      return null;
    }

    try {
      const content = await generateMutation.mutateAsync(promptToUse);
      return content;
    } catch (error) {
      return null;
    }
  }, [state.prompt, state.selectedType, generateMutation]);

  const save = useCallback(async () => {
    if (!state.generatedContent) {
      toast.error('No content to save');
      return null;
    }

    try {
      const workEntryIds = workEntries.map(e => e.id);
      const saved = await saveContent({
        type: state.selectedType!, // Type is set when content was generated
        prompt: state.prompt,
        content: state.generatedContent,
        work_entry_ids: workEntryIds
      });

      toast.success('Content saved!');

      // Reset state after saving
      setState({
        isGenerating: false,
        generatedContent: null,
        selectedType: null,
        prompt: '',
        contextDocument: null,
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
      selectedType: null,
      prompt: '',
      contextDocument: null,
    });
  }, []);

  // Return exact same interface
  return {
    ...state,
    workEntriesCount: workEntries.length,
    setSelectedType,
    setPrompt,
    setContextDocument,
    generate,
    save,
    reset,
  };
}
