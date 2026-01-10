'use client'

import { useState, useRef, useEffect } from "react";
import { FastForward, Trash2, RotateCcw, Pencil, RefreshCw, Mic } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SummaryLoadingOverlay } from "@/components/log/SummaryLoadingOverlay";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { toast } from "sonner";
import { type Message, ConversationStatus } from "@/types/log";

interface LogConversationBoxProps {
  messages: Message[];
  exchangeCount: number;
  maxExchanges: number;
  isLoading: boolean;
  status: ConversationStatus;
  summaryError?: string | null;
  onSubmit: (text: string) => void;
  onSkipToSummary: () => void;
  onRetry?: () => void;
  onClear?: () => void;
  onUndo?: () => void;
}

export function LogConversationBox({
  messages,
  exchangeCount,
  maxExchanges,
  isLoading,
  status,
  summaryError,
  onSubmit,
  onSkipToSummary,
  onRetry,
  onClear,
  onUndo
}: LogConversationBoxProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<'guided' | 'quick'>('guided');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  const isActive = messages.length > 0 && (status === "in_progress" || status === "summarizing");
  const isInProgress = status === "in_progress";
  const isSummarizing = status === "summarizing";
  const isReviewing = status === "review";
  const inputDisabled = isReviewing || isSummarizing;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (value.trim() && !inputDisabled) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMicClick = async () => {
    try {
      if (isRecording) {
        const transcript = await stopRecording();
        if (transcript) {
          setValue(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error(isRecording ? 'Transcription failed. Please try again.' : 'Could not access microphone');
    }
  };

  const showSkipButton = messages.length > 0 && isInProgress && !isLoading;

  // Compact input card (no active conversation)
  if (!isActive) {
    return (
      <div className="input-card">
        {/* Top section: prompt, helper, mic */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm mb-1" style={{ color: '#F1F5F3' }}>
              What did you work on today?
            </p>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Type or tap mic to begin"}
              className={cn(
                "min-h-[24px] max-h-[100px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
                isRecording && "placeholder:text-[#34A853] placeholder:animate-pulse"
              )}
              style={{ color: '#5C6660' }}
              rows={1}
            />
          </div>
          <button
            onClick={handleMicClick}
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

        {/* Footer: Enter hint + mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: '#5C6660' }}>
            Press <kbd className="kbd">Enter</kbd> to start
          </div>
          <div
            className="flex items-center rounded-full p-0.5"
            style={{ background: '#1C2420' }}
          >
            <button
              onClick={() => setMode('guided')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                mode === 'guided'
                  ? "bg-[#2A332E] text-[#F1F5F3]"
                  : "text-[#5C6660] hover:text-[#9CA898]"
              )}
            >
              Guided
            </button>
            <button
              onClick={() => setMode('quick')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                mode === 'quick'
                  ? "bg-[#2A332E] text-[#F1F5F3]"
                  : "text-[#5C6660] hover:text-[#9CA898]"
              )}
            >
              Quick
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active conversation view
  return (
    <div
      className="input-card relative"
      style={{
        borderColor: isFocused ? '#34A853' : '#2A332E',
        boxShadow: isFocused ? '0 0 0 3px rgba(52, 168, 83, 0.1)' : 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: '#5C6660' }}>
          Conversation ({exchangeCount}/{maxExchanges})
        </span>
        <div className="flex items-center gap-1">
          {onUndo && messages.length > 0 && !isLoading && (
            <button
              onClick={onUndo}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Undo"
            >
              <RotateCcw className="h-3.5 w-3.5" style={{ color: '#5C6660' }} />
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Clear"
              disabled={isSummarizing}
            >
              <Trash2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="space-y-3 max-h-[200px] md:max-h-[300px] overflow-y-auto mb-3 custom-scrollbar"
      >
        {messages.map((message, index) => {
          const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
          const canEdit = message.role === "user" && index === lastUserIndex && onUndo && !isLoading;

          return (
            <div
              key={index}
              className={cn(
                "flex group relative",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {canEdit && (
                <button
                  className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[#2A332E] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (onUndo) {
                      onUndo();
                      setValue(message.content);
                      if (textareaRef.current) textareaRef.current.focus();
                    }
                  }}
                  title="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5" style={{ color: '#5C6660' }} />
                </button>
              )}
              <div
                className={cn(
                  "max-w-[90%] md:max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "text-[#0A0F0D]"
                    : "text-[#F1F5F3]"
                )}
                style={{
                  background: message.role === "user" ? '#34A853' : '#1C2420'
                }}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {isLoading && isInProgress && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: '#1C2420', color: '#5C6660' }}
            >
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-3" style={{ borderTop: '1px solid #2A332E' }} />

      {/* Error display */}
      {summaryError && (
        <div
          className="mb-3 p-3 rounded-lg"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <p className="text-sm mb-2" style={{ color: '#EF4444' }}>{summaryError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm flex items-center gap-1.5"
              style={{ color: '#EF4444' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      )}

      {/* Summary loading overlay */}
      {isSummarizing && <SummaryLoadingOverlay />}

      {/* Input area */}
      {!isSummarizing && (
        <div className="flex items-center gap-3">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Continue your response..."}
            disabled={inputDisabled}
            className={cn(
              "min-h-[40px] max-h-[100px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 flex-1",
              isRecording && "placeholder:text-[#34A853] placeholder:animate-pulse"
            )}
            style={{ color: '#F1F5F3' }}
            rows={1}
          />
          <button
            onClick={handleMicClick}
            disabled={inputDisabled}
            className={cn(
              "btn-mic flex-shrink-0",
              isRecording && "animate-recording-pulse"
            )}
          >
            <Mic className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Footer actions */}
      {showSkipButton && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2A332E' }}>
          <button
            onClick={onSkipToSummary}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{ background: '#1C2420', color: '#9CA898' }}
          >
            <FastForward className="h-3.5 w-3.5" />
            End conversation & generate summary
          </button>
        </div>
      )}
    </div>
  );
}
