'use client'

import { useState } from 'react';
import { GenerateType, GenerateTypeOption, getContentTypesForIndustry } from '@/types/generate';
import { cn } from '@/lib/utils';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { SavedPrompt } from '@/hooks/useSavedPrompts';

interface GenerateTypeSelectorProps {
  selectedType: GenerateType | 'saved' | null;
  industry: string | null;
  employmentStatus: string | null;
  studyField: string | null;
  onSelect: (type: GenerateType | 'saved', suggestedPrompt: string) => void;
  // Saved prompts props
  savedPrompts?: SavedPrompt[];
  selectedSavedPromptId?: string | null;
  onSelectSavedPrompt?: (prompt: SavedPrompt) => void;
  onDeleteSavedPrompt?: (id: string) => Promise<boolean>;
  onSaveCurrentPrompt?: (name: string) => Promise<boolean>;
  currentPrompt?: string;
  isCreatingSavedPrompt?: boolean;
  isDeletingSavedPrompt?: boolean;
}

export function GenerateTypeSelector({
  selectedType,
  industry,
  employmentStatus,
  studyField,
  onSelect,
  savedPrompts = [],
  selectedSavedPromptId,
  onSelectSavedPrompt,
  onDeleteSavedPrompt,
  onSaveCurrentPrompt,
  currentPrompt = '',
  isCreatingSavedPrompt = false,
  isDeletingSavedPrompt = false,
}: GenerateTypeSelectorProps) {
  const contentTypes = getContentTypesForIndustry(industry, employmentStatus, studyField);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSavePrompt = () => {
    if (!newPromptName.trim() || !onSaveCurrentPrompt) return;

    const name = newPromptName.trim();
    setNewPromptName('');
    setSaveDialogOpen(false);

    onSaveCurrentPrompt(name);
  };

  const handleDeletePrompt = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDeleteSavedPrompt) return;

    setDeletingId(id);
    await onDeleteSavedPrompt(id);
    setDeletingId(null);
  };

  const canSavePrompt = currentPrompt.trim().length > 0 && onSaveCurrentPrompt;

  return (
    <div className="space-y-6">
      {/* Pre-made prompts section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
          Pre-made Prompts
        </h3>
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((option) => (
            <button
              key={option.type}
              onClick={() => onSelect(option.type, option.suggestedPrompt)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                selectedType === option.type && !selectedSavedPromptId
                  ? "text-[#0A0F0D]"
                  : "hover:border-[#3A443E]"
              )}
              style={{
                background: selectedType === option.type && !selectedSavedPromptId
                  ? '#34A853'
                  : '#1C2420',
                border: `1px solid ${selectedType === option.type && !selectedSavedPromptId ? '#34A853' : '#2A332E'}`,
                color: selectedType === option.type && !selectedSavedPromptId ? '#0A0F0D' : '#F1F5F3'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {selectedType && selectedType !== 'saved' && !selectedSavedPromptId && (
          <p className="text-xs" style={{ color: '#5C6660' }}>
            {contentTypes.find(o => o.type === selectedType)?.description}
          </p>
        )}
      </div>

      {/* Saved prompts section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
          My Saved Prompts
        </h3>

        {savedPrompts.length === 0 && !canSavePrompt ? (
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: '#141A17',
              border: '1px dashed #2A332E'
            }}
          >
            <p className="text-sm" style={{ color: '#5C6660' }}>
              No saved prompts yet. Generate something below, then save it for reuse.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={cn(
                  "relative group flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                )}
                style={{
                  background: selectedSavedPromptId === prompt.id ? '#34A853' : '#1C2420',
                  border: `1px solid ${selectedSavedPromptId === prompt.id ? '#34A853' : '#2A332E'}`,
                  color: selectedSavedPromptId === prompt.id ? '#0A0F0D' : '#F1F5F3'
                }}
                onClick={() => onSelectSavedPrompt?.(prompt)}
              >
                <span>{prompt.name}</span>
                <button
                  onClick={(e) => handleDeletePrompt(e, prompt.id)}
                  disabled={isDeletingSavedPrompt && deletingId === prompt.id}
                  className="ml-1 p-0.5 rounded transition-colors hover:bg-black/10"
                  style={{
                    color: selectedSavedPromptId === prompt.id ? '#0A0F0D' : '#5C6660'
                  }}
                >
                  {isDeletingSavedPrompt && deletingId === prompt.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}

            {/* Save current prompt button */}
            {canSavePrompt && (
              <button
                onClick={() => setSaveDialogOpen(true)}
                disabled={isCreatingSavedPrompt}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: 'transparent',
                  border: '1px dashed #2A332E',
                  color: '#5C6660'
                }}
              >
                {isCreatingSavedPrompt ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span>Save current</span>
              </button>
            )}
          </div>
        )}

        {selectedSavedPromptId && (
          <p className="text-xs" style={{ color: '#5C6660' }}>
            Using saved prompt
          </p>
        )}
      </div>

      {/* Save prompt dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          style={{ background: '#141A17', border: '1px solid #2A332E' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#F1F5F3' }}>Save Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Name your prompt..."
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              className="text-sm"
              style={{
                background: '#1C2420',
                border: '1px solid #2A332E',
                color: '#F1F5F3'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePrompt();
                }
              }}
              autoFocus
            />
            <p className="text-xs mt-2" style={{ color: '#5C6660' }}>
              This will save your current prompt for easy reuse.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              className="text-xs"
              style={{
                background: 'transparent',
                border: '1px solid #2A332E',
                color: '#9CA898'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={!newPromptName.trim() || isCreatingSavedPrompt}
              className="text-xs btn-primary"
            >
              {isCreatingSavedPrompt ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
