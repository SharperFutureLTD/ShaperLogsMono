'use client'

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
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

  const setSelectedType = useCallback((type: GenerateType) => {
    setState(prev => ({ ...prev, selectedType: type }));
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  }, []);

  const generate = useCallback(async (customPrompt?: string) => {
    const promptToUse = customPrompt || state.prompt;

    if (!promptToUse.trim()) {
      toast.error('Please enter a prompt');
      return null;
    }

    setState(prev => ({ ...prev, isGenerating: true, generatedContent: null }));

    try {
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

      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          prompt: promptToUse,
          type: state.selectedType,
          workEntries: entriesForContext,
          industry: profile?.industry || 'general',
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const content = data.content;
      setState(prev => ({ ...prev, generatedContent: content, isGenerating: false }));

      return content;
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      toast.error(errorMessage);
      setState(prev => ({ ...prev, isGenerating: false }));
      return null;
    }
  }, [state.prompt, state.selectedType, workEntries]);

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
