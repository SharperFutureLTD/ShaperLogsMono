export interface StreakData {
  currentStreak: number
  bestStreak: number
  totalLogs: number
  loggedToday: boolean
}

export function calculateStreak(entries: { created_at: string }[]): StreakData {
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
