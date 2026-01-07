'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkEntries } from '@/hooks/useWorkEntries'

interface StreakData {
  currentStreak: number
  bestStreak: number
  totalLogs: number
}

function calculateStreak(entries: { created_at: string }[]): StreakData {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalLogs: 0 }
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

  // Calculate current streak
  let currentStreak = 0
  let checkDate = today

  // Check if logged today or yesterday to start the streak
  const mostRecentLog = uniqueDates[0]
  if (mostRecentLog) {
    mostRecentLog.setHours(0, 0, 0, 0)

    if (mostRecentLog.getTime() === today.getTime()) {
      checkDate = today
    } else if (mostRecentLog.getTime() === yesterday.getTime()) {
      checkDate = yesterday
    } else {
      // Streak is broken - no log today or yesterday
      currentStreak = 0
    }

    if (mostRecentLog.getTime() >= yesterday.getTime()) {
      // Count consecutive days
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

  // Calculate best streak (simplified - scan all dates)
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
    totalLogs: entries.length
  }
}

export function StreakWidget() {
  const { entries, loading } = useWorkEntries()

  const streakData = useMemo(() => {
    if (!entries) return { currentStreak: 0, bestStreak: 0, totalLogs: 0 }
    return calculateStreak(entries)
  }, [entries])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-12 w-12 bg-muted rounded-full mx-auto" />
            <div className="h-8 w-16 bg-muted rounded mx-auto" />
            <div className="h-4 w-24 bg-muted rounded mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Your Streak
        </h3>

        {/* Main streak display */}
        <div className="flex flex-col items-center mb-4">
          <div className={`text-4xl mb-1 ${streakData.currentStreak > 0 ? 'animate-pulse' : 'opacity-30'}`}>
            <Flame className={`h-12 w-12 ${streakData.currentStreak > 0 ? 'text-streak' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-3xl font-bold text-foreground">
            {streakData.currentStreak}
          </div>
          <div className="text-sm text-muted-foreground">
            day{streakData.currentStreak !== 1 ? 's' : ''} streak
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {streakData.bestStreak}
            </div>
            <div className="text-xs text-muted-foreground">
              Best streak
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {streakData.totalLogs}
            </div>
            <div className="text-xs text-muted-foreground">
              Total logs
            </div>
          </div>
        </div>

        {/* Encouragement message */}
        {streakData.currentStreak === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Log your first entry today to start your streak!
          </p>
        )}
        {streakData.currentStreak > 0 && streakData.currentStreak < 7 && (
          <p className="text-xs text-primary text-center mt-4">
            Keep going! You're building a great habit.
          </p>
        )}
        {streakData.currentStreak >= 7 && (
          <p className="text-xs text-primary text-center mt-4">
            Amazing! You're on fire! 🔥
          </p>
        )}
      </CardContent>
    </Card>
  )
}
