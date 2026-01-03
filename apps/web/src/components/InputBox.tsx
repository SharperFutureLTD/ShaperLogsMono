'use client'

import { useState, useRef, useEffect } from "react";
import { Mic } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InputBoxProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function InputBox({ placeholder = "Type here...", onSubmit, disabled }: InputBoxProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
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

  return (
    <div
      className={cn(
        "relative rounded-md border bg-card transition-all duration-200",
        isFocused ? "border-primary ring-1 ring-primary/50" : "border-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Terminal prompt indicator */}
      <div className="absolute left-3 top-3 text-primary font-mono text-sm">
        {">"}
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent pl-8 pr-14 py-3 font-mono text-base md:text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        rows={1}
      />

      {/* Blinking cursor when focused and empty */}
      {isFocused && !value && (
        <span className="absolute left-8 top-3 font-mono text-sm text-foreground cursor-blink">
          _
        </span>
      )}

      {/* Mic button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground hover:text-primary"
        disabled={disabled}
      >
        <Mic className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">[MIC]</span>
      </Button>
    </div>
  );
}
