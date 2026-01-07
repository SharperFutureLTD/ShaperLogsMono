'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkEntries } from '@/hooks/useWorkEntries'

interface MonthlyInsights {
  logsThisMonth: number
  logsLastMonth: number
  skillsThisMonth: number
  skillsLastMonth: number
  percentChange: number
}

function calculateInsights(entries: { created_at: string; skills?: string[] | null }[]): MonthlyInsights {
  if (!entries || entries.length === 0) {
    return {
      logsThisMonth: 0,
      logsLastMonth: 0,
      skillsThisMonth: 0,
      skillsLastMonth: 0,
      percentChange: 0
    }
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonthEntries = entries.filter(e => new Date(e.created_at) >= thisMonthStart)
  const lastMonthEntries = entries.filter(e => {
    const date = new Date(e.created_at)
    return date >= lastMonthStart && date <= lastMonthEnd
  })

  const logsThisMonth = thisMonthEntries.length
  const logsLastMonth = lastMonthEntries.length

  // Count unique skills this month
  const skillsThisMonth = new Set(
    thisMonthEntries.flatMap(e => e.skills || [])
  ).size

  const skillsLastMonth = new Set(
    lastMonthEntries.flatMap(e => e.skills || [])
  ).size

  // Calculate percent change in logs
  let percentChange = 0
  if (logsLastMonth > 0) {
    percentChange = Math.round(((logsThisMonth - logsLastMonth) / logsLastMonth) * 100)
  } else if (logsThisMonth > 0) {
    percentChange = 100
  }

  return {
    logsThisMonth,
    logsLastMonth,
    skillsThisMonth,
    skillsLastMonth,
    percentChange
  }
}

export function InsightsWidget() {
  const { entries, loading } = useWorkEntries()

  const insights = useMemo(() => {
    if (!entries) return null
    return calculateInsights(entries)
  }, [entries])

  if (loading || !insights) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = insights.percentChange > 0
    ? TrendingUp
    : insights.percentChange < 0
      ? TrendingDown
      : Minus

  const trendColor = insights.percentChange > 0
    ? 'text-primary'
    : insights.percentChange < 0
      ? 'text-destructive'
      : 'text-muted-foreground'

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          This Month
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Logs */}
          <div>
            <div className="text-2xl font-bold text-foreground">
              {insights.logsThisMonth}
            </div>
            <div className="text-xs text-muted-foreground">
              Logs
            </div>
            {insights.logsLastMonth > 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span>
                  {insights.percentChange > 0 ? '+' : ''}{insights.percentChange}% vs last month
                </span>
              </div>
            )}
          </div>

          {/* Skills */}
          <div>
            <div className="text-2xl font-bold text-foreground">
              {insights.skillsThisMonth}
            </div>
            <div className="text-xs text-muted-foreground">
              Skills tracked
            </div>
            {insights.skillsLastMonth > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <span>
                  {insights.skillsThisMonth > insights.skillsLastMonth ? '+' : ''}
                  {insights.skillsThisMonth - insights.skillsLastMonth} new
                </span>
              </div>
            )}
          </div>
        </div>

        {insights.logsThisMonth === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border">
            Start logging to see your monthly insights!
          </p>
        )}
      </CardContent>
    </Card>
  )
}
