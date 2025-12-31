'use client'

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Target, Calendar, FileText, Loader2, Pencil } from "lucide-react";
import { useTargetEvidence, type TargetEvidence } from "@/hooks/useTargetEvidence";
import { TargetEditForm } from "./TargetEditForm";
import type { Target as TargetType } from "@/types/targets";

interface TargetDetailSheetProps {
  target: TargetType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (targetId: string, updates: Partial<TargetType>) => Promise<TargetType | null>;
  onTargetUpdated?: (target: TargetType) => void;
}

export function TargetDetailSheet({ target, open, onOpenChange, onUpdate, onTargetUpdated }: TargetDetailSheetProps) {
  const { evidence, isLoading } = useTargetEvidence(target?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!target) return null;

  const hasNumericTarget = target.target_value !== null && target.target_value > 0;
  const progress = hasNumericTarget
    ? Math.min((target.current_value / target.target_value!) * 100, 100)
    : null;

  const formatValue = (value: number) => {
    if (target.unit === 'currency') {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: target.currency_code || 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    if (target.unit === 'percentage') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      kpi: 'KPI',
      ksb: 'KSB',
      sales_target: 'Sales',
      goal: 'Goal'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      kpi: 'bg-blue-500/20 text-blue-400',
      ksb: 'bg-purple-500/20 text-purple-400',
      sales_target: 'bg-green-500/20 text-green-400',
      goal: 'bg-primary/20 text-primary'
    };
    return colors[type] || colors.goal;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSave = async (updates: Partial<TargetType>) => {
    if (!onUpdate) return;

    setIsSaving(true);
    const updatedTarget = await onUpdate(target.id, updates);
    setIsSaving(false);

    if (updatedTarget) {
      onTargetUpdated?.(updatedTarget);
      setIsEditing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditing(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <SheetTitle className="font-mono text-lg">
                {isEditing ? 'Edit Target' : target.name}
              </SheetTitle>
            </div>
            {!isEditing && onUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="font-mono text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded text-xs font-mono ${getTypeColor(target.type)}`}>
                {getTypeLabel(target.type)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {evidence.length} evidence {evidence.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4">
          <div className="space-y-6 pr-4">
            {isEditing ? (
              <TargetEditForm
                target={target}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
              />
            ) : (
              <>
                {/* Target Details */}
                <div className="space-y-3">
                  {target.description && (
                    <p className="text-sm text-muted-foreground">
                      {target.description}
                    </p>
                  )}

                  {hasNumericTarget && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">
                          {formatValue(target.current_value)} / {formatValue(target.target_value!)}
                        </span>
                      </div>
                      <Progress value={progress!} className="h-2" />
                      <div className="text-right text-xs font-mono text-primary">
                        {progress!.toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {target.deadline && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {formatDate(target.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Evidence Section */}
                <div>
                  <h3 className="font-mono text-sm font-medium text-foreground mb-3">
                    Evidence
                  </h3>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : evidence.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="font-mono text-xs text-muted-foreground">
                        No evidence logged yet
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Log work that contributes to this target
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {evidence.map((item) => (
                        <div
                          key={item.work_entry_id}
                          className="p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="font-mono">
                              {formatDate(item.work_entry.created_at)}
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              {formatTime(item.work_entry.created_at)}
                            </span>
                            {item.work_entry.category && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{item.work_entry.category}</span>
                              </>
                            )}
                          </div>

                          <p className="text-sm text-foreground mb-2 line-clamp-3">
                            {item.work_entry.redacted_summary}
                          </p>

                          {/* SMART Format Display */}
                          {item.smart_data ? (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <p className="text-xs font-medium text-foreground font-mono mb-2">
                                SMART Contribution
                              </p>
                              <div className="space-y-1.5">
                                {item.smart_data.specific && (
                                  <div className="flex gap-2">
                                    <span className="shrink-0 w-5 h-5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                                      S
                                    </span>
                                    <p className="text-xs text-muted-foreground">{item.smart_data.specific}</p>
                                  </div>
                                )}
                                {item.smart_data.measurable && (
                                  <div className="flex gap-2">
                                    <span className="shrink-0 w-5 h-5 rounded bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">
                                      M
                                    </span>
                                    <p className="text-xs text-muted-foreground">{item.smart_data.measurable}</p>
                                  </div>
                                )}
                                {item.smart_data.achievable && (
                                  <div className="flex gap-2">
                                    <span className="shrink-0 w-5 h-5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center">
                                      A
                                    </span>
                                    <p className="text-xs text-muted-foreground">{item.smart_data.achievable}</p>
                                  </div>
                                )}
                                {item.smart_data.relevant && (
                                  <div className="flex gap-2">
                                    <span className="shrink-0 w-5 h-5 rounded bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                                      R
                                    </span>
                                    <p className="text-xs text-muted-foreground">{item.smart_data.relevant}</p>
                                  </div>
                                )}
                                {item.smart_data.timeBound && (
                                  <div className="flex gap-2">
                                    <span className="shrink-0 w-5 h-5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
                                      T
                                    </span>
                                    <p className="text-xs text-muted-foreground">{item.smart_data.timeBound}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : item.contribution_note && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-primary">Contribution:</span>{' '}
                                {item.contribution_note}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
