'use client'

import { useGenerateConversation } from '@/hooks/useGenerateConversation';
import { useProfile } from '@/hooks/useProfile';
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
    generate,
    save,
    reset,
  } = useGenerateConversation();

  const handleTypeSelect = (type: GenerateType, suggestedPrompt: string) => {
    setSelectedType(type);
    // Always update prompt when switching content types
    if (suggestedPrompt) {
      setPrompt(suggestedPrompt);
    }
  };

  const handleRegenerate = () => {
    generate();
  };

  const handleSave = async () => {
    const saved = await save();
    if (saved) {
      reset();
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
      />

      {/* Input Box */}
      <GenerateConversationBox
        prompt={prompt}
        selectedType={selectedType}
        isGenerating={isGenerating}
        workEntriesCount={workEntriesCount}
        onPromptChange={setPrompt}
        onGenerate={() => generate()}
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
