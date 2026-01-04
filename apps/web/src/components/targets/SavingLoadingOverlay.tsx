'use client'

import { Save, Loader2 } from "lucide-react";

interface SavingLoadingOverlayProps {
  targetCount: number;
}

export function SavingLoadingOverlay({ targetCount }: SavingLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
      <div className="max-w-md w-full mx-4 p-6 bg-card border border-primary/30 rounded-md shadow-lg">
        {/* Header with save icon */}
        <div className="flex items-center gap-3 mb-4">
          <Save className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-mono text-sm text-primary font-semibold">
            Saving {targetCount} target{targetCount !== 1 ? 's' : ''}...
          </h3>
        </div>

        {/* Indeterminate progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                 style={{
                   animation: 'shimmer 1.5s ease-in-out infinite',
                 }}
            />
          </div>
        </div>

        {/* Status label */}
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          <p className="font-mono text-xs text-muted-foreground">
            Saving to database...
          </p>
        </div>

        {/* Helpful message */}
        <p className="font-mono text-xs text-muted-foreground/70 mt-4 text-center">
          This will only take a moment
        </p>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
