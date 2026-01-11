'use client'

import { useMemo } from 'react'
import { useWorkEntries } from '@/hooks/useWorkEntries'

// Simple up arrow SVG
const UpArrow = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="m18 15-6-6-6 6"/>
  </svg>
)

interface InsightsWidgetProps {
  onViewInsights?: () => void
}

interface MonthlyInsights {
  logsThisMonth: number
  logsLastMonth: number
  skillsThisMonth: number
  skillsLastMonth: number
  percentChange: number
  newSkills: number
}

function calculateInsights(entries: { created_at: string; skills?: string[] | null }[]): MonthlyInsights {
  if (!entries || entries.length === 0) {
    return {
      logsThisMonth: 0,
      logsLastMonth: 0,
      skillsThisMonth: 0,
      skillsLastMonth: 0,
      percentChange: 0,
      newSkills: 0
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

  const skillsThisMonth = new Set(
    thisMonthEntries.flatMap(e => e.skills || [])
  ).size

  const skillsLastMonth = new Set(
    lastMonthEntries.flatMap(e => e.skills || [])
  ).size

  let percentChange = 0
  if (logsLastMonth > 0) {
    percentChange = Math.round(((logsThisMonth - logsLastMonth) / logsLastMonth) * 100)
  } else if (logsThisMonth > 0) {
    percentChange = 100
  }

  const newSkills = Math.max(0, skillsThisMonth - skillsLastMonth)

  return {
    logsThisMonth,
    logsLastMonth,
    skillsThisMonth,
    skillsLastMonth,
    percentChange,
    newSkills
  }
}

export function InsightsWidget({ onViewInsights }: InsightsWidgetProps) {
  const { entries, loading } = useWorkEntries()

  const insights = useMemo(() => {
    if (!entries) return null
    return calculateInsights(entries)
  }, [entries])

  if (loading || !insights) {
    return (
      <div>
        <div className="section-header">
          <span className="section-title-muted">THIS MONTH</span>
          <button className="section-action">Insights →</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card animate-pulse">
            <div className="h-6 w-8 bg-[#2A332E] rounded mb-1" />
            <div className="h-3 w-12 bg-[#2A332E] rounded" />
          </div>
          <div className="stat-card animate-pulse">
            <div className="h-6 w-8 bg-[#2A332E] rounded mb-1" />
            <div className="h-3 w-12 bg-[#2A332E] rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">THIS MONTH</span>
        <button onClick={onViewInsights} className="section-action">
          Insights →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Logs */}
        <div className="stat-card">
          <div className="stat-value">{insights.logsThisMonth}</div>
          <div className="stat-label">Logs</div>
          {insights.percentChange !== 0 && (
            <div className="stat-change flex items-center gap-0.5">
              <UpArrow className="h-3 w-3" />
              <span>{insights.percentChange > 0 ? '+' : ''}{insights.percentChange}%</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="stat-card">
          <div className="stat-value">{insights.skillsThisMonth}</div>
          <div className="stat-label">Skills</div>
          {insights.newSkills > 0 && (
            <div className="stat-change flex items-center gap-0.5">
              <UpArrow className="h-3 w-3" />
              <span>+{insights.newSkills} new</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
