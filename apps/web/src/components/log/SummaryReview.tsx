'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, Loader2, Target } from "lucide-react";
import type { SummaryData } from "@/types/log";

interface SummaryReviewProps {
  summary: SummaryData;
  isLoading: boolean;
  onUpdate: (newSummary: string) => void;
  onAccept: () => void;
}

export function SummaryReview({
  summary,
  isLoading,
  onUpdate,
  onAccept
}: SummaryReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(summary.redactedSummary);

  const handleSave = () => {
    onUpdate(editValue);
    setIsEditing(false);
  };

  // Highlight redacted placeholders
  const highlightRedactions = (text: string) => {
    const parts = text.split(/(\[(?:CLIENT|AMOUNT|NAME|EMAIL|PHONE|PROJECT|REDACTED)\])/g);
    return parts.map((part, i) => {
      if (part.match(/^\[(?:CLIENT|AMOUNT|NAME|EMAIL|PHONE|PROJECT|REDACTED)\]$/)) {
        return (
          <span key={i} className="text-primary font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="animate-fade-in rounded-md border border-primary/50 bg-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-muted-foreground">
          // summary
        </span>
        <span className="font-mono text-xs text-primary">ready for review</span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] font-mono resize-none text-base md:text-sm py-2 leading-snug"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="font-mono text-xs"
            >
              [CANCEL]
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="font-mono text-xs"
            >
              [SAVE]
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-mono text-sm text-foreground mb-4 leading-relaxed">
            {highlightRedactions(summary.redactedSummary)}
          </p>

          {/* Target Mappings */}
          {summary.targetMappings && summary.targetMappings.length > 0 && (
            <div className="mb-4">
              <span className="font-mono text-xs text-muted-foreground mb-2 block">
                // linked targets
              </span>
              <div className="space-y-2">
                {summary.targetMappings.map((mapping, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono bg-primary/10 px-2 py-1.5 rounded">
                    <Target className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-foreground">{mapping.targetName}</span>
                    {mapping.contributionValue && (
                      <span className="text-primary font-bold ml-auto">
                        +{mapping.contributionValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {summary.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-muted rounded text-xs font-mono text-muted-foreground"
              >
                {skill}
              </span>
            ))}
            <span className="px-2 py-0.5 bg-primary/20 rounded text-xs font-mono text-primary">
              {summary.category}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
              className="font-mono text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              [EDIT]
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onAccept}
              disabled={isLoading}
              className="font-mono text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              [ACCEPT]
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
