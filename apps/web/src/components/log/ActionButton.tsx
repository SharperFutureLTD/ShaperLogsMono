'use client'

import { Mic, ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionButtonMode = 'mic' | 'recording' | 'transcribing' | 'send';

interface ActionButtonProps {
  mode: ActionButtonMode;
  onMicClick: () => void;
  onSendClick: () => void;
  disabled?: boolean;
}

// Waveform animation component
function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      <div
        className="w-1 h-2.5 bg-destructive rounded-full animate-wave"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-1 h-3.5 bg-destructive rounded-full animate-wave"
        style={{ animationDelay: '75ms' }}
      />
      <div
        className="w-1 h-5 bg-destructive rounded-full animate-wave"
        style={{ animationDelay: '150ms' }}
      />
      <div
        className="w-1 h-3.5 bg-destructive rounded-full animate-wave"
        style={{ animationDelay: '225ms' }}
      />
      <div
        className="w-1 h-2.5 bg-destructive rounded-full animate-wave"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

export function ActionButton({
  mode,
  onMicClick,
  onSendClick,
  disabled
}: ActionButtonProps) {
  const handleClick = () => {
    if (mode === 'send') {
      onSendClick();
    } else if (mode === 'mic' || mode === 'recording') {
      onMicClick();
    }
    // transcribing state is not clickable
  };

  const isClickable = mode !== 'transcribing';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || !isClickable}
      className={cn(
        "h-8 w-8 text-muted-foreground hover:text-primary transition-colors",
        mode === 'send' && "text-primary hover:text-primary/80",
        mode === 'recording' && "text-destructive hover:text-destructive"
      )}
      title={
        mode === 'mic' ? 'Start recording' :
        mode === 'recording' ? 'Stop recording' :
        mode === 'transcribing' ? 'Transcribing...' :
        'Send message'
      }
    >
      {mode === 'transcribing' ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : mode === 'recording' ? (
        <WaveformAnimation />
      ) : mode === 'send' ? (
        <ArrowUp className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
