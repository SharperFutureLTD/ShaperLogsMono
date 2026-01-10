'use client'

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Target as TargetType } from "@/types/targets";

interface TargetCardProps {
  target: TargetType;
  evidenceCount?: number;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function TargetCard({ target, evidenceCount = 0, onDelete, onClick }: TargetCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const hasNumericTarget = target.target_value !== null && target.target_value > 0;
  const progress = hasNumericTarget
    ? Math.min(Math.round((target.current_value / target.target_value!) * 100), 100)
    : 0;

  // Status calculations
  const isCompleted = progress >= 100;
  const isOverdue = target.deadline && new Date(target.deadline) < new Date() && !isCompleted;

  // Check if behind schedule
  const isBehind = (() => {
    if (isCompleted) return false;
    if (isOverdue) return true;

    if (target.deadline && target.created_at && hasNumericTarget) {
      const totalTime = new Date(target.deadline).getTime() - new Date(target.created_at).getTime();
      const elapsedTime = Date.now() - new Date(target.created_at).getTime();
      const expectedProgress = (elapsedTime / totalTime) * 100;
      return progress < expectedProgress * 0.8;
    }

    return false;
  })();

  const daysUntilDeadline = target.deadline
    ? Math.ceil((new Date(target.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const progressColor = isBehind ? '#F59E0B' : '#34A853';
  const badgeBg = isBehind ? 'rgba(245, 158, 11, 0.2)' : 'rgba(52, 168, 83, 0.2)';
  const badgeColor = isBehind ? '#F59E0B' : '#34A853';
  const badgeText = isBehind ? 'Behind' : 'On Track';

  const formatDeadline = (deadline: string): string => {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  return (
    <div
      className="target-card group"
      onClick={handleCardClick}
    >
      {/* Top row: Name and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: '#F1F5F3' }}>
            {target.name}
          </span>
          {target.deadline && (
            <span className="text-xs flex-shrink-0" style={{ color: '#5C6660' }}>
              Due {formatDeadline(target.deadline)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {badgeText}
          </span>
          {/* Hover actions */}
          <div className="hover-actions flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" style={{ color: '#5C6660' }} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmDelete(true);
              }}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {hasNumericTarget && (
        <div className="progress-bar mb-2">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%`, background: progressColor }}
          />
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-between items-center text-xs" style={{ color: '#5C6660' }}>
        <span>
          {target.current_value} / {target.target_value} {target.unit || 'hrs'}
        </span>
        {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
          <span>{daysUntilDeadline} days left</span>
        )}
        {daysUntilDeadline !== null && daysUntilDeadline <= 0 && (
          <span style={{ color: '#EF4444' }}>Overdue</span>
        )}
      </div>

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div
          className="mt-3 p-3 rounded-lg flex items-center justify-between"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <span className="text-sm" style={{ color: '#EF4444' }}>Delete this target?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmDelete(false);
              }}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ color: '#9CA898' }}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(target.id);
                setShowConfirmDelete(false);
              }}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ background: '#EF4444', color: '#fff' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
