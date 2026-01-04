'use client'

import { useEffect, useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_STAGES = [
  { label: "Analyzing conversation...", progress: 0 },
  { label: "Extracting key achievements...", progress: 33 },
  { label: "Linking to targets...", progress: 66 },
  { label: "Finalizing summary...", progress: 90 }
];

const STAGE_DURATION = 2000; // 2 seconds per stage

export function SummaryLoadingOverlay() {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through stages
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < LOADING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev; // Stay at final stage
      });
    }, STAGE_DURATION);

    return () => clearInterval(stageInterval);
  }, []);

  useEffect(() => {
    // Smoothly animate progress to current stage's target
    const targetProgress = LOADING_STAGES[currentStage].progress;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < targetProgress) {
          return Math.min(prev + 2, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStage]);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex items-center justify-center rounded-md">
      <div className="max-w-md w-full mx-4 p-6 bg-card border border-primary/30 rounded-md shadow-lg">
        {/* Header with lightning icon */}
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-mono text-sm text-primary font-semibold">
            Generating your summary...
          </h3>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-right">
            <span className="font-mono text-xs text-muted-foreground">
              {progress}%
            </span>
          </div>
        </div>

        {/* Current stage label */}
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          <p className="font-mono text-xs text-muted-foreground">
            {LOADING_STAGES[currentStage].label}
          </p>
        </div>
      </div>
    </div>
  );
}
