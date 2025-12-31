'use client'

import { KeyboardEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GenerateType } from '@/types/generate';

interface GenerateConversationBoxProps {
  prompt: string;
  selectedType: GenerateType;
  isGenerating: boolean;
  workEntriesCount: number;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
}

export function GenerateConversationBox({
  prompt,
  selectedType,
  isGenerating,
  workEntriesCount,
  onPromptChange,
  onGenerate,
}: GenerateConversationBoxProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onGenerate();
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you'd like to generate..."
          disabled={isGenerating}
          className="min-h-[100px] resize-none pr-12 font-mono text-sm"
        />
        <Button
          size="icon"
          onClick={onGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="absolute bottom-3 right-3"
        >
          {isGenerating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>
          Using {workEntriesCount} work {workEntriesCount === 1 ? 'entry' : 'entries'} as context
        </span>
      </div>
    </div>
  );
}
