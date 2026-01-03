'use client'

import { useState } from "react";
import { Target, Trash2, Calendar, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsTouchDevice } from "@/hooks/use-touch-device";
import type { Target as TargetType } from "@/types/targets";

interface TargetCardProps {
  target: TargetType;
  evidenceCount?: number;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function TargetCard({ target, evidenceCount = 0, onDelete, onClick }: TargetCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isTouchDevice = useIsTouchDevice();
  const hasNumericTarget = target.target_value !== null && target.target_value > 0;
  const progress = hasNumericTarget
    ? Math.min((target.current_value / target.target_value!) * 100, 100)
    : null;

  // Status calculations
  const isCompleted = progress !== null && progress >= 100;
  const isOverdue = target.deadline && new Date(target.deadline) < new Date() && !isCompleted;
  const daysUntilDeadline = target.deadline
    ? Math.ceil((new Date(target.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isAtRisk = !isCompleted && !isOverdue && daysUntilDeadline !== null && daysUntilDeadline <= 7 && (progress === null || progress < 75);

  const getStatusBorderColor = () => {
    if (isCompleted) return 'border-l-green-500';
    if (isOverdue) return 'border-l-destructive';
    if (isAtRisk) return 'border-l-yellow-500';
    return '';
  };

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening detail when clicking delete button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer group border-l-4",
        getStatusBorderColor() || "border-l-transparent"
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-mono text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {target.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${getTypeColor(target.type)}`}>
            {getTypeLabel(target.type)}
          </span>
          {/* Only show delete button on non-touch devices (touch devices use swipe gesture) */}
          {!isTouchDevice && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-6 md:w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{target.name}"? This will remove it from your active targets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(target.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {target.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {target.description}
        </p>
      )}

      {hasNumericTarget && (
        <div className="space-y-2">
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

      {/* Status Badge */}
      {(isCompleted || isOverdue || isAtRisk) && (
        <div className="flex items-center gap-1 mt-3">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-destructive/20 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {isAtRisk && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              At Risk
            </span>
          )}
        </div>
      )}

      {/* Evidence Count */}
      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span className="font-mono">
          {evidenceCount} {evidenceCount === 1 ? 'entry' : 'entries'} linked
        </span>
      </div>

      {target.deadline && (
        <div className={cn(
          "flex items-center gap-1 mt-2 text-xs",
          isOverdue ? "text-destructive" : "text-muted-foreground"
        )}>
          <Calendar className="h-3 w-3" />
          <span>Due: {new Date(target.deadline).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
