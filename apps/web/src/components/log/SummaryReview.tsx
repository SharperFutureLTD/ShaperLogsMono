'use client'

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, Pencil, Loader2, Target, X, Plus } from "lucide-react";
import { useTargets } from "@/hooks/useTargets";
import type { SummaryData, TargetMapping } from "@/types/log";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SummaryReviewProps {
  summary: SummaryData;
  isLoading: boolean;
  onUpdate: (newSummary: string) => void;
  onUpdateTargetMappings: (mappings: TargetMapping[]) => void;
  onAccept: () => void;
}

export function SummaryReview({
  summary,
  isLoading,
  onUpdate,
  onUpdateTargetMappings,
  onAccept
}: SummaryReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(summary.redactedSummary);
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [editingContributionValue, setEditingContributionValue] = useState<string>('');
  const [showAddTarget, setShowAddTarget] = useState(false);
  const { targets } = useTargets();

  // Filter and validate target mappings before rendering
  const validTargetMappings = useMemo(() => {
    if (!summary.targetMappings || !targets) {
      return [];
    }

    const valid = summary.targetMappings.filter(mapping => {
      // Find the actual target in user's targets list
      const target = targets.find(t => t.id === mapping.targetId);

      // Validate:
      // 1. Target exists in user's targets list
      // 2. Target has a non-empty name
      // 3. Contribution value is valid (> 0)
      const isValid = target &&
        target.name &&
        target.name.trim().length > 0 &&
        mapping.contributionValue &&
        mapping.contributionValue > 0;

      if (!isValid) {
        console.warn('[SummaryReview] Filtered invalid target mapping:', {
          targetId: mapping.targetId,
          targetName: mapping.targetName,
          contributionValue: mapping.contributionValue,
          targetExists: !!target,
          targetHasName: (target?.name?.trim()?.length ?? 0) > 0
        });
      }

      return isValid;
    });

    if (valid.length < summary.targetMappings.length) {
      console.warn(
        `[SummaryReview] Filtered ${summary.targetMappings.length - valid.length} invalid target mappings`
      );
    }

    return valid;
  }, [summary.targetMappings, targets]);

  const handleSave = () => {
    onUpdate(editValue);
    setIsEditing(false);
  };

  // Get available targets (those not already linked)
  const availableTargets = useMemo(() => {
    if (!targets) return [];
    const linkedTargetIds = new Set(summary.targetMappings?.map(m => m.targetId) || []);
    return targets.filter(t => t.status === 'active' && !linkedTargetIds.has(t.id));
  }, [targets, summary.targetMappings]);

  // Handler to unlink a target
  const handleUnlinkTarget = useCallback((targetId: string) => {
    const updatedMappings = (summary.targetMappings || []).filter(m => m.targetId !== targetId);
    onUpdateTargetMappings(updatedMappings);
  }, [summary.targetMappings, onUpdateTargetMappings]);

  // Handler to start editing a contribution value
  const handleStartEditContribution = useCallback((targetId: string, currentValue: number | undefined) => {
    setEditingContributionId(targetId);
    setEditingContributionValue(currentValue?.toString() || '');
  }, []);

  // Handler to save contribution value edit
  const handleSaveContribution = useCallback(() => {
    if (!editingContributionId) return;

    const newValue = parseFloat(editingContributionValue);
    if (isNaN(newValue) || newValue < 0) {
      setEditingContributionId(null);
      return;
    }

    const updatedMappings = (summary.targetMappings || []).map(m =>
      m.targetId === editingContributionId
        ? { ...m, contributionValue: newValue }
        : m
    );
    onUpdateTargetMappings(updatedMappings);
    setEditingContributionId(null);
  }, [editingContributionId, editingContributionValue, summary.targetMappings, onUpdateTargetMappings]);

  // Handler to add a new target
  const handleAddTarget = useCallback((targetId: string) => {
    const target = targets?.find(t => t.id === targetId);
    if (!target) return;

    const newMapping: TargetMapping = {
      targetId: target.id,
      targetName: target.name,
      contributionValue: target.type === 'ksb' ? 1 : undefined, // Default 1 for KSBs
      contributionNote: '',
    };

    const updatedMappings = [...(summary.targetMappings || []), newMapping];
    onUpdateTargetMappings(updatedMappings);
    setShowAddTarget(false);
  }, [targets, summary.targetMappings, onUpdateTargetMappings]);

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
          <div className="mb-4">
            <span className="font-mono text-xs text-muted-foreground mb-2 block">
              // linked targets
            </span>
            {(summary.targetMappings && summary.targetMappings.length > 0) ? (
              <div className="space-y-2">
                {summary.targetMappings.map((mapping, i) => {
                  // Use targetName from API response, or fall back to looking up from targets list
                  const target = targets?.find(t => t.id === mapping.targetId);
                  const displayName = mapping.targetName || target?.name || 'Unknown Target';
                  const unit = target?.unit || '';
                  const isEditingThis = editingContributionId === mapping.targetId;

                  return (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono bg-primary/10 px-2 py-1.5 rounded group">
                      <Target className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="text-foreground">{displayName}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editingContributionValue}
                              onChange={(e) => setEditingContributionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveContribution();
                                if (e.key === 'Escape') setEditingContributionId(null);
                              }}
                              className="w-16 h-6 text-xs font-mono px-1"
                              autoFocus
                            />
                            {unit && <span className="text-muted-foreground">{unit}</span>}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveContribution}
                              className="h-5 w-5 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditContribution(mapping.targetId, mapping.contributionValue)}
                            className="text-primary font-bold hover:underline cursor-pointer"
                            title="Click to edit"
                          >
                            +{mapping.contributionValue?.toLocaleString() || '?'}{unit && ` ${unit}`}
                          </button>
                        )}
                        <button
                          onClick={() => handleUnlinkTarget(mapping.targetId)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="Unlink target"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-mono text-muted-foreground italic">
                No targets linked
              </div>
            )}

            {/* Add Target Button */}
            {availableTargets.length > 0 && (
              <div className="mt-2">
                {showAddTarget ? (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleAddTarget}>
                      <SelectTrigger className="h-7 text-xs font-mono flex-1">
                        <SelectValue placeholder="Select a target..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id} className="text-xs font-mono">
                            {target.name}
                            {target.unit && <span className="text-muted-foreground ml-1">({target.unit})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTarget(false)}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTarget(true)}
                    className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add target
                  </button>
                )}
              </div>
            )}
          </div>

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
