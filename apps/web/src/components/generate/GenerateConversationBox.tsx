'use client'

import { KeyboardEvent, useRef, useState } from 'react';
import { Send, Sparkles, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GenerateType } from '@/types/generate';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

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
  selectedType: GenerateType;
  isGenerating: boolean;
  workEntriesCount: number;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  contextDocument?: string | null;
  onContextDocumentChange?: (content: string | null) => void;
}

export function GenerateConversationBox({
  prompt,
  selectedType,
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

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you'd like to generate..."
          disabled={isGenerating}
          className="min-h-[100px] resize-none pr-12 pb-12 font-mono text-base md:text-sm py-2 leading-snug"
        />
        
        {/* File attachment area */}
        <div className="absolute bottom-3 left-3 right-12 flex items-center gap-2">
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
            <div>
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
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGenerating}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Attach Context'}
              </Button>
            </div>
          )}
        </div>

        <Button
          size="icon"
          onClick={onGenerate}
          disabled={!prompt.trim() || isGenerating || isUploading}
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
