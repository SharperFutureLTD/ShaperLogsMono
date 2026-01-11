'use client'

import { Mic, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionButtonMode = 'mic' | 'recording' | 'transcribing' | 'send';

interface ActionButtonProps {
  mode: ActionButtonMode;
  onMicClick: () => void;
  onSendClick: () => void;
  disabled?: boolean;
  size?: 'default' | 'large';
}

// Waveform animation component with green bars
function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      <div
        className="w-1 h-2.5 rounded-full animate-wave"
        style={{ animationDelay: '0ms', backgroundColor: '#34A853' }}
      />
      <div
        className="w-1 h-3.5 rounded-full animate-wave"
        style={{ animationDelay: '75ms', backgroundColor: '#34A853' }}
      />
      <div
        className="w-1 h-5 rounded-full animate-wave"
        style={{ animationDelay: '150ms', backgroundColor: '#34A853' }}
      />
      <div
        className="w-1 h-3.5 rounded-full animate-wave"
        style={{ animationDelay: '225ms', backgroundColor: '#34A853' }}
      />
      <div
        className="w-1 h-2.5 rounded-full animate-wave"
        style={{ animationDelay: '300ms', backgroundColor: '#34A853' }}
      />
    </div>
  );
}

export function ActionButton({
  mode,
  onMicClick,
  onSendClick,
  disabled,
  size = 'default'
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
  const isLarge = size === 'large';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !isClickable}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0",
        isLarge ? "w-12 h-12" : "w-10 h-10",
        // Default mic state: green button
        mode === 'mic' && "bg-[#34A853] text-[#0A0F0D] hover:scale-105",
        // Recording state: dark background so green waveform shows, with pulse
        mode === 'recording' && "bg-[#1C2420] animate-recording-pulse",
        // Transcribing state: dark background with spinner
        mode === 'transcribing' && "bg-[#1C2420] text-[#34A853] cursor-wait",
        // Send state: green button with arrow
        mode === 'send' && "bg-[#34A853] text-[#0A0F0D] hover:scale-105",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={
        mode === 'mic' ? 'Start recording' :
        mode === 'recording' ? 'Stop recording' :
        mode === 'transcribing' ? 'Transcribing...' :
        'Send message'
      }
    >
      {mode === 'transcribing' ? (
        <Loader2 className={cn("animate-spin", isLarge ? "h-6 w-6" : "h-5 w-5")} />
      ) : mode === 'recording' ? (
        <WaveformAnimation />
      ) : mode === 'send' ? (
        <ArrowUp className={cn(isLarge ? "h-6 w-6" : "h-5 w-5")} />
      ) : (
        <Mic className={cn(isLarge ? "h-6 w-6" : "h-5 w-5")} />
      )}
    </button>
  );
}
