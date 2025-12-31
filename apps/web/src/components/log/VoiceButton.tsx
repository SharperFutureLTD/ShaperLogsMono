'use client'

import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<string> | Promise<void>;
  disabled?: boolean;
}

export function VoiceButton({
  isRecording,
  isTranscribing,
  onStartRecording,
  onStopRecording,
  disabled
}: VoiceButtonProps) {
  const handleClick = async () => {
    try {
      if (isRecording) {
        await onStopRecording();
      } else {
        await onStartRecording();
      }
    } catch (error) {
      console.error('Voice recording error:', error);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      className={cn(
        "font-mono text-xs text-muted-foreground hover:text-primary transition-colors",
        isRecording && "text-destructive hover:text-destructive animate-pulse"
      )}
    >
      {isTranscribing ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          <span className="hidden sm:inline">[...]</span>
        </>
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">[STOP]</span>
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">[MIC]</span>
        </>
      )}
    </Button>
  );
}
