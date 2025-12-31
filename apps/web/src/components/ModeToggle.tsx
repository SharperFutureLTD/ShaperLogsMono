'use client'

import { FileText, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type Mode = "log" | "generate" | "targets";

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

const modes = [
  { id: "log" as Mode, label: "Log", icon: FileText },
  { id: "generate" as Mode, label: "Generate", icon: Sparkles },
  { id: "targets" as Mode, label: "Targets", icon: Target },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const activeIndex = modes.findIndex(m => m.id === mode);

  return (
    <div className="relative inline-flex rounded-xl border border-border p-1.5 bg-card/50 backdrop-blur-sm">
      {/* Sliding background indicator */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-lg bg-primary shadow-md transition-all duration-300 ease-out pointer-events-none"
        style={{
          width: `calc((100% - 12px) / 3)`,
          left: `calc(6px + ${activeIndex} * ((100% - 12px) / 3))`,
        }}
      />

      {/* Buttons */}
      {modes.map(({ id, label, icon: Icon }, index) => {
        const isActive = mode === id;
        const isPreviousActive = activeIndex === index - 1;

        return (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={cn(
              "flex-1 min-w-[100px] relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 z-10",
              "active:scale-[0.98]",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Separator line - only show between non-active adjacent buttons */}
            {index > 0 && !isActive && !isPreviousActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-px bg-border" />
            )}

            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
