'use client'

import { useMemo } from 'react'
import { Target } from 'lucide-react'
import { useTargets } from '@/hooks/useTargets'
import type { Target as TargetType } from '@/types/targets'

interface ActiveTargetsPreviewProps {
  onViewAll?: () => void
  limit?: number
}

function getTargetStatus(target: TargetType): 'on_track' | 'behind' | 'completed' {
  const hasNumericTarget = target.target_value !== null && target.target_value > 0
  const progress = hasNumericTarget
    ? Math.min((target.current_value / target.target_value!) * 100, 100)
    : null

  if (progress !== null && progress >= 100) return 'completed'
  if (target.deadline && new Date(target.deadline) < new Date()) return 'behind'

  // Check if behind schedule based on progress vs time elapsed
  if (target.deadline && target.created_at && hasNumericTarget) {
    const totalTime = new Date(target.deadline).getTime() - new Date(target.created_at).getTime()
    const elapsedTime = Date.now() - new Date(target.created_at).getTime()
    const expectedProgress = (elapsedTime / totalTime) * 100
    if (progress !== null && progress < expectedProgress * 0.8) return 'behind'
  }

  return 'on_track'
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDaysLeft(deadline: string): number {
  const now = new Date()
  const target = new Date(deadline)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ActiveTargetsPreview({ onViewAll, limit = 2 }: ActiveTargetsPreviewProps) {
  const { targets, loading } = useTargets()

  const activeTargets = useMemo(() => {
    if (!targets) return []
    return targets
      .filter(t => t.status === 'active')
      .slice(0, limit)
  }, [targets, limit])

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <span className="section-title-muted">TARGETS</span>
          <button className="section-action">All →</button>
        </div>
        <div className="space-y-2">
          <div className="target-card animate-pulse">
            <div className="h-4 w-24 bg-[#2A332E] rounded mb-2" />
            <div className="h-2 w-full bg-[#2A332E] rounded" />
          </div>
          <div className="target-card animate-pulse">
            <div className="h-4 w-24 bg-[#2A332E] rounded mb-2" />
            <div className="h-2 w-full bg-[#2A332E] rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">TARGETS</span>
        {onViewAll && (
          <button onClick={onViewAll} className="section-action">
            All →
          </button>
        )}
      </div>

      {activeTargets.length === 0 ? (
        <div className="empty-card">
          <Target className="h-6 w-6 mx-auto mb-2" style={{ color: '#5C6660' }} />
          <p className="text-xs" style={{ color: '#5C6660' }}>
            No active targets
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTargets.map((target) => {
            const status = getTargetStatus(target)
            const hasNumericTarget = target.target_value !== null && target.target_value > 0
            const progress = hasNumericTarget
              ? Math.min(Math.round((target.current_value / target.target_value!) * 100), 100)
              : 0

            const isWarning = status === 'behind'
            const progressColor = isWarning ? '#F59E0B' : '#34A853'
            const badgeBg = isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(52, 168, 83, 0.2)'
            const badgeColor = isWarning ? '#F59E0B' : '#34A853'
            const badgeText = isWarning ? 'Behind' : 'On Track'

            return (
              <div
                key={target.id}
                className="rounded-lg p-3"
                style={{ background: '#1C2420', border: '1px solid #2A332E' }}
              >
                {/* Name and status */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium truncate" style={{ color: '#F1F5F3' }}>
                    {target.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                    style={{ background: badgeBg, color: badgeColor }}
                  >
                    {badgeText}
                  </span>
                </div>

                {/* Progress bar */}
                {hasNumericTarget && (
                  <div className="progress-bar mb-1.5">
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
                  {target.deadline && (
                    <span>
                      {formatDeadline(target.deadline)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
