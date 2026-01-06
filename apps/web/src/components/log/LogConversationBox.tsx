'use client'

import { useState, useRef, useEffect } from "react";
import { FastForward, Trash2, RotateCcw, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/log/ActionButton";
import { SummaryLoadingOverlay } from "@/components/log/SummaryLoadingOverlay";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { toast } from "sonner";
import { type Message, ConversationStatus } from "@/types/log";

type ActionButtonMode = 'mic' | 'recording' | 'transcribing' | 'send';

interface LogConversationBoxProps {
  messages: Message[];
  exchangeCount: number;
  maxExchanges: number;
  isLoading: boolean;
  status: ConversationStatus;
  onSubmit: (text: string) => void;
  onSkipToSummary: () => void;
  onClear?: () => void;
  onUndo?: () => void;
}

export function LogConversationBox({
  messages,
  exchangeCount,
  maxExchanges,
  isLoading,
  status,
  onSubmit,
  onSkipToSummary,
  onClear,
  onUndo
}: LogConversationBoxProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [actionButtonMode, setActionButtonMode] = useState<ActionButtonMode>('mic');
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
  // Only disable input during summarization or review, NOT during conversation
  const inputDisabled = isReviewing || isSummarizing;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Manage action button mode transitions
  useEffect(() => {
    if (isRecording) {
      setActionButtonMode('recording');
    } else if (isTranscribing) {
      setActionButtonMode('transcribing');
    } else if (value.trim().length > 0) {
      setActionButtonMode('send');
    } else {
      setActionButtonMode('mic');
    }
  }, [isRecording, isTranscribing, value]);

  // Auto-scroll messages to bottom
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
        // Stop recording
        const transcript = await stopRecording();
        if (transcript) {
          setValue(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      } else {
        // Start recording
        await startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error(isRecording ? 'Transcription failed. Please try again.' : 'Could not access microphone');
    }
  };

  const showSkipButton = messages.length > 0 && isInProgress && !isLoading;

  return (
    <div
      className={cn(
        "rounded-md border bg-card transition-all duration-300 ease-out overflow-hidden relative",
        isFocused && !isActive ? "border-primary ring-1 ring-primary/50" : "border-border",
        isActive && "border-primary/50",
        isReviewing && "opacity-50 cursor-not-allowed" // Only apply opacity during review, NOT summarization
      )}
    >
      {/* Messages area - expands when conversation is active */}
      {isActive && (
        <div className="animate-expand-in relative">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <span className="font-mono text-xs text-muted-foreground">
              // conversation
            </span>
            {onClear && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={onClear}
                title="Clear chat"
                disabled={isSummarizing}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={messagesRef}
            className="space-y-3 max-h-[200px] md:max-h-[300px] overflow-y-auto px-4 pb-3 custom-scrollbar"
          >
            {messages.map((message, index) => {
              const isLastUserMessage = message.role === "user" && index === messages.length - 2; // Assuming assistant replied last
              // Actually, if isLoading is true, the last message is user. If not, last is assistant.
              // But we want to edit the LAST user message regardless of if AI replied.
              // If AI replied, "undo" removes AI + User.
              // So we find the last 'user' message index.
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -left-8 top-1/2 -translate-y-1/2 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (onUndo) {
                          onUndo();
                          setValue(message.content);
                          if (textareaRef.current) textareaRef.current.focus();
                        }
                      }}
                      title="Edit message"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <div
                    className={cn(
                      "max-w-[90%] md:max-w-[85%] rounded-md px-3 py-2 font-mono text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <span className="opacity-60 mr-2">
                      {message.role === "user" ? ">" : "$"}
                    </span>
                    {message.content}
                  </div>
                </div>
              );
            })}

            {/* AI typing indicator */}
            {isLoading && isInProgress && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-sm">
                  <span className="opacity-60 mr-2">$</span>
                  <span className="text-muted-foreground animate-pulse">typing</span>
                </div>
              </div>
            )}
          </div>

          {/* Separator before input */}
          <div className="border-t border-border/50" />

          {/* Summary loading overlay - shown on top of messages during summarization */}
          {isSummarizing && <SummaryLoadingOverlay />}
        </div>
      )}

      {/* Input area - always visible (except when summarizing) */}
      {!isSummarizing && (
        <div className="flex flex-col gap-0">
          {/* Top: Input area */}
          <div className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
              {/* Terminal prompt indicator */}
              <div className="absolute left-3 top-1/2 -translate-y-[52%] text-primary font-mono text-sm z-10">
                {">"}
              </div>

              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "recording" : messages.length === 0 ? "What did you work on today?" : "Continue your response..."}
                disabled={inputDisabled}
                className={cn(
                  "min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent pl-9 pr-14 py-2 font-mono text-base md:text-sm leading-snug focus-visible:ring-0 focus-visible:ring-offset-0",
                  isRecording && "placeholder:text-destructive placeholder:animate-pulse"
                )}
                rows={1}
              />

              {/* Blinking cursor when focused and empty */}
              {isFocused && !value && !isRecording && (
                <span className="absolute left-9 top-1/2 -translate-y-1/2 font-mono text-sm text-foreground cursor-blink">
                  _
                </span>
              )}

              {/* Action button (mic/send) */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ActionButton
                  mode={actionButtonMode}
                  onMicClick={handleMicClick}
                  onSendClick={handleSubmit}
                  disabled={inputDisabled}
                />
              </div>
            </div>
          </div>

          {/* Bottom: Action bar */}
          {(showSkipButton || (onUndo && messages.length > 0 && !isLoading)) && (
            <div className="border-t border-border/50 bg-muted/20 px-3 py-2">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {onUndo && messages.length > 0 && !isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onUndo}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    title="Undo last message (removes your last answer and AI's response)"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Undo
                  </Button>
                )}
                {showSkipButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onSkipToSummary}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    title="End the conversation and generate a summary"
                  >
                    <FastForward className="h-4 w-4 mr-2" />
                    End conversation
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
