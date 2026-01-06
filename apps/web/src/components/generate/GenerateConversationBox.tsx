'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react';
import { Sparkles, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { ActionButton } from '@/components/log/ActionButton';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

// File type validation configuration
const FILE_TYPES = {
  'application/pdf': { max: 10, label: 'PDF' },
  'text/plain': { max: 2, label: 'Text' },
  'text/markdown': { max: 2, label: 'Markdown' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { max: 5, label: 'Word' },
  'application/msword': { max: 5, label: 'Word' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { max: 10, label: 'Excel' },
  'text/csv': { max: 10, label: 'CSV' },
  'application/vnd.ms-excel': { max: 10, label: 'Excel' },
} as const;

interface GenerateConversationBoxProps {
  prompt: string;
  isGenerating: boolean;
  workEntriesCount: number;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  contextDocument?: string | null;
  onContextDocumentChange?: (content: string | null) => void;
}

type ActionButtonMode = 'mic' | 'recording' | 'transcribing' | 'send';

export function GenerateConversationBox({
  prompt,
  isGenerating,
  workEntriesCount,
  onPromptChange,
  onGenerate,
  contextDocument,
  onContextDocumentChange,
}: GenerateConversationBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [actionButtonMode, setActionButtonMode] = useState<ActionButtonMode>('mic');
  const [isFocused, setIsFocused] = useState(false);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Manage action button mode transitions
  useEffect(() => {
    if (isRecording) {
      setActionButtonMode('recording');
    } else if (isTranscribing) {
      setActionButtonMode('transcribing');
    } else if (prompt.trim().length > 0) {
      setActionButtonMode('send');
    } else {
      setActionButtonMode('mic');
    }
  }, [isRecording, isTranscribing, prompt]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onGenerate();
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileType = FILE_TYPES[file.type as keyof typeof FILE_TYPES];
    if (!fileType) {
      toast.error(`Unsupported file type: ${file.type}. Please use PDF, Word, Excel, CSV, or Text files.`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size
    const maxSizeBytes = fileType.max * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`${fileType.label} files must be under ${fileType.max}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      e.target.value = ''; // Reset input
      return;
    }

    setIsUploading(true);
    try {
      const result = await apiClient.uploadDocument(file, 'generation_context');
      if (result.parsed_content && onContextDocumentChange) {
        onContextDocumentChange(result.parsed_content);
        setFileName(file.name);
        toast.success(`Context document uploaded: ${file.name}`);
      } else {
        throw new Error('Failed to parse document content');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    if (onContextDocumentChange) {
      onContextDocumentChange(null);
      setFileName(null);
    }
  };

  const handleMicClick = async () => {
    try {
      if (isRecording) {
        const transcript = await stopRecording();
        if (transcript) {
          onPromptChange(prompt ? `${prompt} ${transcript}` : transcript);
        }
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error(isRecording ? 'Transcription failed' : 'Could not access microphone');
    }
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Input area */}
      <div className="p-3">
        <div className="relative flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isRecording ? "recording" : "Describe what you'd like to generate..."}
            disabled={isGenerating || isTranscribing}
            className={`min-h-[48px] max-h-[200px] resize-none pr-14 py-2 font-mono text-base md:text-sm leading-snug border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isRecording ? 'placeholder:text-destructive placeholder:animate-pulse' : ''
            }`}
          />

          {/* Blinking cursor when focused and empty */}
          {isFocused && !prompt && !isRecording && (
            <span className="absolute left-3 top-3 font-mono text-sm text-foreground cursor-blink">
              _
            </span>
          )}

          {/* Action button (mic/send) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <ActionButton
              mode={actionButtonMode}
              onMicClick={handleMicClick}
              onSendClick={onGenerate}
              disabled={isGenerating || isUploading}
            />
          </div>
        </div>
      </div>

      {/* Action bar - below input */}
      <div className="border-t border-border/50 bg-muted/20 px-3 py-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Work entries context indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>
              {workEntriesCount} {workEntriesCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-border" />

          {/* File attachment button */}
          {contextDocument ? (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md text-xs border border-border">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[200px] font-medium">{fileName || 'Context Document'}</span>
              <button
                onClick={handleRemoveFile}
                className="hover:text-destructive transition-colors ml-1"
                disabled={isGenerating}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={isUploading || isGenerating}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGenerating}
                className="text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Attach Context'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
