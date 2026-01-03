'use client'

import { useRef, useState, useCallback } from 'react';
import { Archive, Trash2, Pencil, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TargetCard } from './TargetCard';
import type { Target } from '@/types/targets';

interface SwipeableTargetCardProps {
  target: Target;
  evidenceCount?: number;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (id: string) => void;
  onClick?: () => void;
}

export function SwipeableTargetCard({
  target,
  evidenceCount,
  onDelete,
  onArchive,
  onEdit,
  onClick,
}: SwipeableTargetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const SWIPE_THRESHOLD = 80; // px to reveal actions
  const MAX_SWIPE = 240; // 4 actions × 60px width

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    currentX.current = translateX;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Determine swipe direction on first move
    if (isHorizontalSwipe.current === null) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only handle horizontal swipes (left only)
    if (isHorizontalSwipe.current && deltaX < 0) {
      e.preventDefault(); // Prevent scroll
      const newX = Math.max(-MAX_SWIPE, currentX.current + deltaX);
      setTranslateX(newX);
    }
  }, [isSwiping, MAX_SWIPE]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);

    // Snap to open or closed based on threshold
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-MAX_SWIPE);
      setShowActions(true);
    } else {
      setTranslateX(0);
      setShowActions(false);
    }

    isHorizontalSwipe.current = null;
  }, [translateX, SWIPE_THRESHOLD, MAX_SWIPE]);

  const handleAction = (action: () => void) => {
    // Close swipe and execute action
    setTranslateX(0);
    setShowActions(false);
    action();
  };

  const handleCardClick = () => {
    if (showActions) {
      // If actions are showing, close them instead of opening detail
      setTranslateX(0);
      setShowActions(false);
    } else {
      onClick?.();
    }
  };

  return (
    <div className="relative overflow-hidden touch-pan-y">
      {/* Action Buttons (revealed on swipe) */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 flex items-stretch",
          "transition-opacity duration-200",
          showActions ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ width: `${MAX_SWIPE}px` }}
      >
        <button
          onClick={() => handleAction(() => onEdit(target.id))}
          className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors"
          aria-label="Edit target"
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleAction(() => onClick?.())}
          className="flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white transition-colors"
          aria-label="View details"
        >
          <Eye className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleAction(() => onArchive(target.id))}
          className="flex-1 flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white transition-colors"
          aria-label="Archive target"
        >
          <Archive className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleAction(() => onDelete(target.id))}
          className="flex-1 flex items-center justify-center bg-destructive hover:bg-destructive/90 active:bg-destructive/80 text-destructive-foreground transition-colors"
          aria-label="Delete target"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Swipeable Card */}
      <div
        ref={cardRef}
        className={cn(
          "relative z-10 bg-card",
          isSwiping ? "transition-none" : "transition-transform duration-300 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <TargetCard
          target={target}
          evidenceCount={evidenceCount}
          onDelete={onDelete}
          onClick={handleCardClick}
        />
      </div>
    </div>
  );
}
