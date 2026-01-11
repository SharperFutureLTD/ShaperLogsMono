'use client'

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useWorkEntries } from '@/hooks/useWorkEntries';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useProfile } from '@/hooks/useProfile';
import { GenerateType } from '@/types/generate';
import { toast } from 'sonner';

interface GenerateMeta {
  timeRangeParsed?: boolean;
  timeRangeDescription?: string;
  usedSummaries?: boolean;
  entriesUsed?: number;
}

interface GenerateState {
  isGenerating: boolean;
  generatedContent: string | null;
  selectedType: GenerateType | null;
  prompt: string;
  contextDocument: string | null;
  lastGenerateMeta: GenerateMeta | null;
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
    lastGenerateMeta: null,
  });

  // GENERATE CONTENT MUTATION (migrated from Edge Function to REST API)
  // Now uses server-side time-range parsing, periodic summaries, and AI profiles
  const generateMutation = useMutation({
    mutationFn: async (promptToUse: string) => {
      // The API now handles:
      // 1. Parsing time ranges from the prompt (e.g., "today", "this week")
      // 2. Using periodic summaries for users with 50+ entries
      // 3. Fetching relevant entries based on context
      // We no longer send all entries - let the API decide what to use
      const response = await apiClient.generateContent({
        prompt: promptToUse,
        type: state.selectedType || 'general',
        // Don't send entries - API will fetch based on prompt analysis
        industry: profile?.industry || 'general',
        contextDocument: state.contextDocument || undefined,
        // Let API use summaries automatically
        useSummaries: true,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return {
        content: response.content,
        meta: response.meta,
      };
    },

    onMutate: () => {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        generatedContent: null,
        lastGenerateMeta: null,
      }));
    },

    onSuccess: (result) => {
      setState(prev => ({
        ...prev,
        generatedContent: result.content,
        isGenerating: false,
        lastGenerateMeta: result.meta || null,
      }));
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

    try {
      const result = await generateMutation.mutateAsync(promptToUse);
      return result.content;
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
        lastGenerateMeta: null,
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
      lastGenerateMeta: null,
    });
  }, []);

  // Return interface with new meta fields
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
