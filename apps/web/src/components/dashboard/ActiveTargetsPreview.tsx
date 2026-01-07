'use client'

import { useMemo } from 'react'
import { Target, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTargets } from '@/hooks/useTargets'
import type { Target as TargetType } from '@/types/targets'

interface ActiveTargetsPreviewProps {
  onViewAll?: () => void
  limit?: number
}

function getTargetStatus(target: TargetType): 'on_track' | 'overdue' | 'completed' {
  const hasNumericTarget = target.target_value !== null && target.target_value > 0
  const progress = hasNumericTarget
    ? Math.min((target.current_value / target.target_value!) * 100, 100)
    : null

  if (progress !== null && progress >= 100) return 'completed'
  if (target.deadline && new Date(target.deadline) < new Date()) return 'overdue'
  return 'on_track'
}

function getStatusBadge(status: 'on_track' | 'overdue' | 'completed') {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Done
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
          On track
        </Badge>
      )
  }
}

export function ActiveTargetsPreview({ onViewAll, limit = 3 }: ActiveTargetsPreviewProps) {
  const { targets, loading } = useTargets()

  const activeTargets = useMemo(() => {
    if (!targets) return []
    return targets
      .filter(t => t.status === 'active')
      .slice(0, limit)
  }, [targets, limit])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active Targets
          </h3>
          {onViewAll && targets && targets.length > limit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="text-xs text-primary hover:text-primary h-auto p-0"
            >
              View all
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        {activeTargets.length === 0 ? (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No active targets yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set goals to track your progress
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTargets.map((target) => {
              const status = getTargetStatus(target)
              const hasNumericTarget = target.target_value !== null && target.target_value > 0
              const progress = hasNumericTarget
                ? Math.min(Math.round((target.current_value / target.target_value!) * 100), 100)
                : null

              return (
                <div
                  key={target.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium text-foreground line-clamp-1">
                      {target.name}
                    </h4>
                    {getStatusBadge(status)}
                  </div>

                  {progress !== null && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{target.current_value} / {target.target_value} {target.unit || ''}</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  )}

                  {target.deadline && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due {new Date(target.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
