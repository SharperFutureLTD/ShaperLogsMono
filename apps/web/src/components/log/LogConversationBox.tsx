'use client'

import { useState, useRef, useEffect } from "react";
import { FastForward, Trash2, RotateCcw, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VoiceButton } from "@/components/log/VoiceButton";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { toast } from "sonner";
import type { Message, ConversationStatus } from "@/types/log";

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
  const inputDisabled = isLoading || isReviewing || isSummarizing;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

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

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const handleStopRecording = async () => {
    try {
      const transcript = await stopRecording();
      if (transcript) {
        setValue(prev => prev ? `${prev} ${transcript}` : transcript);
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Transcription failed. Please try again.');
    }
  };

  const showSkipButton = messages.length > 0 && isInProgress && !isLoading;

  return (
    <div
      className={cn(
        "rounded-md border bg-card transition-all duration-300 ease-out overflow-hidden",
        isFocused && !isActive ? "border-primary ring-1 ring-primary/50" : "border-border",
        isActive && "border-primary/50",
        inputDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Messages area - expands when conversation is active */}
      {isActive && (
        <div className="animate-expand-in">
          {/* Progress indicator */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
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
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: maxExchanges }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i < exchangeCount ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {exchangeCount}/{maxExchanges}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesRef}
            className="space-y-3 max-h-[200px] md:max-h-[300px] overflow-y-auto px-4 pb-3"
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
                  <span className="cursor-blink">_</span>
                </div>
              </div>
            )}
          </div>

          {/* Separator before input */}
          <div className="border-t border-border/50" />
        </div>
      )}

      {/* Summarizing state */}
      {isSummarizing && (
        <div className="px-4 py-6 text-center">
          <span className="font-mono text-sm text-primary animate-pulse">
            generating summary<span className="cursor-blink">_</span>
          </span>
        </div>
      )}

      {/* Input area - always visible when not summarizing */}
      {!isSummarizing && (
        <div className="relative">
          {/* Terminal prompt indicator */}
          <div className="absolute left-3 top-3 text-primary font-mono text-sm z-10">
            {">"}
          </div>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "recording" : "What did you work on today?"}
            disabled={inputDisabled}
            className={cn(
              "min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent pl-8 pr-24 py-2 font-mono text-base md:text-sm leading-snug focus-visible:ring-0 focus-visible:ring-offset-0",
              isRecording && "placeholder:text-destructive placeholder:animate-pulse"
            )}
            rows={1}
          />

          {/* Blinking cursor when focused and empty */}
          {isFocused && !value && !isRecording && (
            <span className="absolute left-8 top-2 font-mono text-sm text-foreground cursor-blink">
              _
            </span>
          )}

          {/* Right side controls */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Undo button */}
            {onUndo && messages.length > 0 && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onUndo}
                className="font-mono text-xs text-muted-foreground hover:text-primary h-8 w-8 p-0"
                title="Undo last message"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}

            {/* Skip to summary button */}
            {showSkipButton && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSkipToSummary}
                className="font-mono text-xs text-muted-foreground hover:text-primary"
              >
                <FastForward className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">[SKIP]</span>
              </Button>
            )}

            {/* Voice button */}
            <VoiceButton
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              disabled={inputDisabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
