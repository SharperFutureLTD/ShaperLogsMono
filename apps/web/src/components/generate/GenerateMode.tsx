'use client'

import { useState } from 'react';
import { useGenerateConversation } from '@/hooks/useGenerateConversation';
import { useProfile } from '@/hooks/useProfile';
import { useSavedPrompts, SavedPrompt } from '@/hooks/useSavedPrompts';
import { GenerateTypeSelector } from './GenerateTypeSelector';
import { GenerateConversationBox } from './GenerateConversationBox';
import { GeneratedContentCard } from './GeneratedContentCard';
import { GenerateHistory } from './GenerateHistory';
import { GenerateType } from '@/types/generate';

export function GenerateMode() {
  const { profile } = useProfile();
  const {
    isGenerating,
    generatedContent,
    selectedType,
    prompt,
    workEntriesCount,
    setSelectedType,
    setPrompt,
    setContextDocument,
    generate,
    save,
    reset,
    contextDocument,
  } = useGenerateConversation();

  const {
    savedPrompts,
    createPrompt,
    deletePrompt,
    isCreating: isCreatingSavedPrompt,
    isDeleting: isDeletingSavedPrompt,
  } = useSavedPrompts();

  // Track which saved prompt is selected (if any)
  const [selectedSavedPromptId, setSelectedSavedPromptId] = useState<string | null>(null);

  const handleTypeSelect = (type: GenerateType | 'saved', suggestedPrompt: string) => {
    // Clear saved prompt selection when selecting a pre-made prompt
    setSelectedSavedPromptId(null);
    setSelectedType(type as GenerateType);
    // Always update prompt when switching content types
    if (suggestedPrompt) {
      setPrompt(suggestedPrompt);
    }
  };

  const handleSelectSavedPrompt = (savedPrompt: SavedPrompt) => {
    setSelectedSavedPromptId(savedPrompt.id);
    setPrompt(savedPrompt.prompt_text);
    // Keep the currently selected type or default to first available
  };

  const handleSaveCurrentPrompt = async (name: string): Promise<boolean> => {
    if (!prompt.trim()) return false;
    return createPrompt({ name, prompt_text: prompt.trim() });
  };

  const handleDeleteSavedPrompt = async (id: string): Promise<boolean> => {
    const success = await deletePrompt(id);
    // Clear selection if we deleted the selected prompt
    if (success && selectedSavedPromptId === id) {
      setSelectedSavedPromptId(null);
    }
    return success;
  };

  const handleRegenerate = () => {
    generate();
  };

  const handleSave = async () => {
    const saved = await save();
    if (saved) {
      reset();
      setSelectedSavedPromptId(null);
    }
  };

  // Clear saved prompt selection when user edits the prompt
  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    // If prompt was edited and doesn't match the saved prompt, clear selection
    if (selectedSavedPromptId) {
      const savedPrompt = savedPrompts.find(p => p.id === selectedSavedPromptId);
      if (savedPrompt && newPrompt !== savedPrompt.prompt_text) {
        setSelectedSavedPromptId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <GenerateTypeSelector
        selectedType={selectedType}
        industry={profile?.industry || null}
        employmentStatus={profile?.employment_status || null}
        studyField={profile?.study_field || null}
        onSelect={handleTypeSelect}
        savedPrompts={savedPrompts}
        selectedSavedPromptId={selectedSavedPromptId}
        onSelectSavedPrompt={handleSelectSavedPrompt}
        onDeleteSavedPrompt={handleDeleteSavedPrompt}
        onSaveCurrentPrompt={handleSaveCurrentPrompt}
        currentPrompt={prompt}
        isCreatingSavedPrompt={isCreatingSavedPrompt}
        isDeletingSavedPrompt={isDeletingSavedPrompt}
      />

      {/* Input Box */}
      <GenerateConversationBox
        prompt={prompt}
        selectedType={selectedType}
        isGenerating={isGenerating}
        workEntriesCount={workEntriesCount}
        onPromptChange={handlePromptChange}
        onGenerate={() => generate()}
        contextDocument={contextDocument}
        onContextDocumentChange={setContextDocument}
      />

      {/* Generated Content */}
      {(isGenerating || generatedContent) && (
        <GeneratedContentCard
          content={generatedContent || ''}
          isGenerating={isGenerating}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
        />
      )}

      {/* History */}
      <GenerateHistory />
    </div>
  );
}
