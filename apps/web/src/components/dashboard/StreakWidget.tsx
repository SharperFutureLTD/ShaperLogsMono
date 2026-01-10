'use client'

import { useMemo } from 'react'
import { useWorkEntries } from '@/hooks/useWorkEntries'

// Custom two-tone flame icon
const FlameIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 23C7.5 23 4 19.5 4 15.5C4 13.5 5 11.5 6.5 9.5C7.5 8.2 8.7 7 10 5.8L12 4l2 1.8c1.3 1.2 2.5 2.4 3.5 3.7 1.5 2 2.5 4 2.5 6C20 19.5 16.5 23 12 23Z" fill="#F59E0B"/>
    <path d="M12 23c-2 0-3.5-1.5-3.5-3.5 0-1 .5-2 1.3-3 .4-.5.9-1 1.4-1.5l.8-.7.8.7c.5.5 1 1 1.4 1.5.8 1 1.3 2 1.3 3 0 2-1.5 3.5-3.5 3.5Z" fill="#FCD34D"/>
  </svg>
)

interface StreakData {
  currentStreak: number
  bestStreak: number
  totalLogs: number
  loggedToday: boolean
}

function calculateStreak(entries: { created_at: string }[]): StreakData {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalLogs: 0, loggedToday: false }
  }

  // Sort entries by date descending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Get unique dates (just the date part, no time)
  const uniqueDates = [...new Set(
    sortedEntries.map(e => new Date(e.created_at).toDateString())
  )].map(d => new Date(d))

  // Sort dates descending
  uniqueDates.sort((a, b) => b.getTime() - a.getTime())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if logged today
  const mostRecentLog = uniqueDates[0]
  let loggedToday = false
  if (mostRecentLog) {
    mostRecentLog.setHours(0, 0, 0, 0)
    loggedToday = mostRecentLog.getTime() === today.getTime()
  }

  // Calculate current streak
  let currentStreak = 0
  let checkDate = today

  if (mostRecentLog) {
    if (mostRecentLog.getTime() === today.getTime()) {
      checkDate = today
    } else if (mostRecentLog.getTime() === yesterday.getTime()) {
      checkDate = yesterday
    } else {
      currentStreak = 0
    }

    if (mostRecentLog.getTime() >= yesterday.getTime()) {
      for (const date of uniqueDates) {
        date.setHours(0, 0, 0, 0)
        if (date.getTime() === checkDate.getTime()) {
          currentStreak++
          checkDate = new Date(checkDate)
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (date.getTime() < checkDate.getTime()) {
          break
        }
      }
    }
  }

  // Calculate best streak
  let bestStreak = currentStreak
  let tempStreak = 0
  let prevDate: Date | null = null

  for (const date of [...uniqueDates].sort((a, b) => a.getTime() - b.getTime())) {
    date.setHours(0, 0, 0, 0)

    if (prevDate === null) {
      tempStreak = 1
    } else {
      const dayDiff = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      if (dayDiff === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }

    bestStreak = Math.max(bestStreak, tempStreak)
    prevDate = date
  }

  return {
    currentStreak,
    bestStreak,
    totalLogs: entries.length,
    loggedToday
  }
}

export function StreakWidget() {
  const { entries, loading } = useWorkEntries()

  const streakData = useMemo(() => {
    if (!entries) return { currentStreak: 0, bestStreak: 0, totalLogs: 0, loggedToday: false }
    return calculateStreak(entries)
  }, [entries])

  const isGlowing = streakData.loggedToday && streakData.currentStreak > 0

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <span className="section-title-muted">YOUR STREAK</span>
        </div>
        <div className="streak-card relative">
          <div className="animate-pulse">
            <div className="absolute top-3 left-3 h-7 w-7 bg-[#2A332E] rounded" />
            <div className="space-y-2 py-2 text-center">
              <div className="h-10 w-10 bg-[#2A332E] rounded mx-auto" />
              <div className="h-4 w-16 bg-[#2A332E] rounded mx-auto" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">YOUR STREAK</span>
      </div>
      <div className={`streak-card ${isGlowing ? 'glowing' : ''} relative`}>
        {/* Flame icon - top left */}
        <div
          className="absolute top-3 left-3"
          style={{
            filter: isGlowing ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' : 'none',
            opacity: isGlowing ? 1 : 0.5
          }}
        >
          <FlameIcon size={28} />
        </div>

        {/* Streak number */}
        <div
          className="text-4xl font-bold streak-number pt-2"
          style={{
            color: isGlowing ? '#FBBF24' : '#F1F5F3',
            textShadow: isGlowing ? '0 0 20px rgba(251, 191, 36, 0.4)' : 'none'
          }}
        >
          {streakData.currentStreak}
        </div>

        {/* Label */}
        <div className="text-sm" style={{ color: '#9CA898' }}>
          day streak
        </div>

        {/* Divider */}
        <div className="my-3 mx-4" style={{ borderTop: '1px solid #2A332E' }} />

        {/* Stats row */}
        <div className="flex justify-center gap-8 text-center">
          <div>
            <div className="text-base font-semibold" style={{ color: '#F1F5F3' }}>
              {streakData.bestStreak}
            </div>
            <div className="text-xs" style={{ color: '#5C6660' }}>
              Best
            </div>
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: '#F1F5F3' }}>
              {streakData.totalLogs}
            </div>
            <div className="text-xs" style={{ color: '#5C6660' }}>
              Total
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
