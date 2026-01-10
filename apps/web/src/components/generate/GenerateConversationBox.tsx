'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react';
import { Sparkles, Paperclip, FileText, X, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

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

    const fileType = FILE_TYPES[file.type as keyof typeof FILE_TYPES];
    if (!fileType) {
      toast.error(`Unsupported file type: ${file.type}. Please use PDF, Word, Excel, CSV, or Text files.`);
      e.target.value = '';
      return;
    }

    const maxSizeBytes = fileType.max * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`${fileType.label} files must be under ${fileType.max}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      e.target.value = '';
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
    <div
      className="input-card"
      style={{
        borderColor: isFocused ? '#34A853' : '#2A332E',
        boxShadow: isFocused ? '0 0 0 3px rgba(52, 168, 83, 0.1)' : 'none'
      }}
    >
      {/* Top section: prompt, helper, mic */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {!prompt && (
            <p className="text-sm mb-1" style={{ color: '#F1F5F3' }}>
              Describe what you'd like to generate
            </p>
          )}
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : (prompt ? "" : "Type or tap mic to begin")}
            disabled={isGenerating || isTranscribing}
            className={cn(
              "min-h-[24px] max-h-[100px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
              isRecording && "placeholder:text-[#34A853] placeholder:animate-pulse"
            )}
            style={{ color: '#F1F5F3' }}
            rows={1}
          />
        </div>
        <button
          onClick={handleMicClick}
          disabled={isGenerating || isTranscribing}
          className={cn(
            "btn-mic flex-shrink-0",
            isRecording && "animate-recording-pulse"
          )}
        >
          <Mic className="h-5 w-5" />
        </button>
      </div>

      {/* Divider */}
      <div className="my-3" style={{ borderTop: '1px solid #2A332E' }} />

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Work entries context indicator */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5C6660' }}>
            <Sparkles className="h-3 w-3" style={{ color: '#34A853' }} />
            <span>{workEntriesCount} {workEntriesCount === 1 ? 'entry' : 'entries'}</span>
          </div>

          {/* File attachment */}
          {contextDocument ? (
            <div
              className="flex items-center gap-2 px-2 py-1 rounded text-xs"
              style={{ background: '#1C2420', border: '1px solid #2A332E' }}
            >
              <FileText className="h-3.5 w-3.5" style={{ color: '#34A853' }} />
              <span className="truncate max-w-[150px]" style={{ color: '#F1F5F3' }}>
                {fileName || 'Context Document'}
              </span>
              <button
                onClick={handleRemoveFile}
                className="transition-colors"
                style={{ color: '#5C6660' }}
                disabled={isGenerating}
              >
                <X className="h-3.5 w-3.5 hover:text-[#EF4444]" />
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGenerating}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: '#5C6660' }}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Attach Context'}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs" style={{ color: '#5C6660' }}>
          Press <kbd className="kbd">Enter</kbd> to generate
        </div>
      </div>
    </div>
  );
}
