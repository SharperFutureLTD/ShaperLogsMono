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
  selectedType: GenerateType | 'saved';
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

    // Close dialog immediately - optimistic update handles the UI
    const name = newPromptName.trim();
    setNewPromptName('');
    setSaveDialogOpen(false);

    // Fire and forget - errors are handled by the mutation's rollback
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
    <div className="space-y-4">
      {/* Pre-made prompts section */}
      <div className="space-y-2">
        <label className="font-mono text-xs text-muted-foreground">
          // pre-made prompts
        </label>
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((option) => (
            <button
              key={option.type}
              onClick={() => onSelect(option.type, option.suggestedPrompt)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                "border",
                selectedType === option.type && !selectedSavedPromptId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {selectedType !== 'saved' && !selectedSavedPromptId && (
          <p className="text-xs text-muted-foreground">
            {contentTypes.find(o => o.type === selectedType)?.description}
          </p>
        )}
      </div>

      {/* Saved prompts section */}
      <div className="space-y-2">
        <label className="font-mono text-xs text-muted-foreground">
          // my saved prompts
        </label>
        <div className="flex flex-wrap gap-2">
          {savedPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={cn(
                "relative group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border cursor-pointer",
                selectedSavedPromptId === prompt.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => onSelectSavedPrompt?.(prompt)}
            >
              <span>{prompt.name}</span>
              <button
                onClick={(e) => handleDeletePrompt(e, prompt.id)}
                disabled={isDeletingSavedPrompt && deletingId === prompt.id}
                className={cn(
                  "ml-1 p-0.5 rounded hover:bg-destructive/20 transition-colors",
                  selectedSavedPromptId === prompt.id
                    ? "text-primary-foreground/70 hover:text-primary-foreground"
                    : "text-muted-foreground hover:text-destructive"
                )}
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground"
            >
              {isCreatingSavedPrompt ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              <span>Save current</span>
            </button>
          )}

          {savedPrompts.length === 0 && !canSavePrompt && (
            <p className="text-xs text-muted-foreground italic">
              Type a prompt below, then save it here for reuse
            </p>
          )}
        </div>
        {selectedSavedPromptId && (
          <p className="text-xs text-muted-foreground">
            Using saved prompt
          </p>
        )}
      </div>

      {/* Save prompt dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-mono">Save Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Name your prompt..."
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePrompt();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              This will save your current prompt for easy reuse.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={!newPromptName.trim() || isCreatingSavedPrompt}
              className="font-mono text-xs"
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
