'use client'

import { useEffect, useState } from "react";
import { Target, Loader2 } from "lucide-react";

interface ExtractionLoadingOverlayProps {
  isUploading: boolean;
  isExtracting: boolean;
}

const UPLOAD_STAGES = [
  { label: "Uploading document...", progress: 0 },
  { label: "Processing file...", progress: 50 },
];

const EXTRACTION_STAGES = [
  { label: "Parsing file contents...", progress: 0 },
  { label: "Extracting targets with AI...", progress: 33 },
  { label: "Validating extracted data...", progress: 66 },
  { label: "Almost done...", progress: 90 },
];

const STAGE_DURATION = 2000; // 2 seconds per stage

export function ExtractionLoadingOverlay({ isUploading, isExtracting }: ExtractionLoadingOverlayProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = isUploading ? UPLOAD_STAGES : EXTRACTION_STAGES;

  // Reset when switching between upload and extraction phases
  useEffect(() => {
    setCurrentStage(0);
    setProgress(0);
  }, [isUploading, isExtracting]);

  useEffect(() => {
    // Cycle through stages
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev; // Stay at final stage
      });
    }, STAGE_DURATION);

    return () => clearInterval(stageInterval);
  }, [stages.length]);

  useEffect(() => {
    // Smoothly animate progress to current stage's target
    const targetProgress = stages[currentStage]?.progress ?? 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < targetProgress) {
          return Math.min(prev + 2, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStage, stages]);

  const currentLabel = stages[currentStage]?.label ?? "Processing...";

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
      <div className="max-w-md w-full mx-4 p-6 bg-card border border-primary/30 rounded-md shadow-lg">
        {/* Header with target icon */}
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-mono text-sm text-primary font-semibold">
            {isUploading ? "Uploading your document..." : "Extracting targets..."}
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
          This may take a moment for larger documents
        </p>
      </div>
    </div>
  );
}
