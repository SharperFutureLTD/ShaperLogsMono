'use client'

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface ResumeLoadingOverlayProps {
  isProcessing: boolean;
}

const STAGES = [
  { label: "Uploading document...", progress: 0 },
  { label: "Processing file...", progress: 25 },
  { label: "Parsing resume content...", progress: 50 },
  { label: "Extracting career history with AI...", progress: 75 },
  { label: "Almost done...", progress: 90 },
];

// Each stage lasts 12 seconds (5 stages × 12s = 60 seconds to reach 90%)
const STAGE_DURATION = 12000;

export function ResumeLoadingOverlay({ isProcessing }: ResumeLoadingOverlayProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  // Reset when processing starts/stops
  useEffect(() => {
    if (isProcessing) {
      setCurrentStage(0);
      setProgress(0);
    }
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;

    // Cycle through stages
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev; // Stay at final stage
      });
    }, STAGE_DURATION);

    return () => clearInterval(stageInterval);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;

    // Smoothly animate progress to current stage's target
    const targetProgress = STAGES[currentStage]?.progress ?? 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < targetProgress) {
          return Math.min(prev + 2, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStage, isProcessing]);

  if (!isProcessing) return null;

  const currentLabel = STAGES[currentStage]?.label ?? "Processing...";

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
      <div className="max-w-md w-full mx-4 p-6 bg-card border border-primary/30 rounded-md shadow-lg">
        {/* Header with document icon */}
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-mono text-sm text-primary font-semibold">
            Parsing your resume...
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
            {currentLabel}
          </p>
        </div>

        {/* Helpful message */}
        <p className="font-mono text-xs text-muted-foreground/70 mt-4 text-center">
          This may take a minute for larger documents
        </p>
      </div>
    </div>
  );
}
