'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { useWorkEntries } from '@/hooks/useWorkEntries'

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
        <div className="streak-card">
          <div className="animate-pulse space-y-3 py-2">
            <div className="h-7 w-7 bg-[#2A332E] rounded-full mx-auto" />
            <div className="h-8 w-8 bg-[#2A332E] rounded mx-auto" />
            <div className="h-4 w-16 bg-[#2A332E] rounded mx-auto" />
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
      <div className={`streak-card ${isGlowing ? 'glowing' : ''}`}>
        {/* Flame icon */}
        <div className="mb-1">
          <Flame
            className={`h-7 w-7 mx-auto streak-icon ${isGlowing ? '' : 'opacity-50'}`}
            style={{ color: '#FBBF24' }}
          />
        </div>

        {/* Streak number */}
        <div
          className={`text-3xl font-bold streak-number ${isGlowing ? '' : ''}`}
          style={{ color: isGlowing ? '#FBBF24' : '#F1F5F3' }}
        >
          {streakData.currentStreak}
        </div>

        {/* Label */}
        <div className="text-xs" style={{ color: '#5C6660' }}>
          day streak
        </div>

        {/* Divider */}
        <div className="my-3 mx-4" style={{ borderTop: '1px solid #2A332E' }} />

        {/* Stats row */}
        <div className="flex justify-center gap-6 text-center">
          <div>
            <span className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
              {streakData.bestStreak}
            </span>
            <span className="text-xs ml-1" style={{ color: '#5C6660' }}>
              Best
            </span>
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
              {streakData.totalLogs}
            </span>
            <span className="text-xs ml-1" style={{ color: '#5C6660' }}>
              Total
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
