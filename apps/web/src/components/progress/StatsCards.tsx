'use client'

import { TrendingUp } from 'lucide-react'

interface StatsCardsProps {
  logsCount: number
  logsGrowth: number
  skillsCount: number
  newSkills: number
  currentStreak: number
  bestStreak: number
}

export function StatsCards({
  logsCount,
  logsGrowth,
  skillsCount,
  newSkills,
  currentStreak,
  bestStreak,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Logs */}
      <div className="stat-card">
        <div className="text-2xl font-bold" style={{ color: '#F1F5F3' }}>
          {logsCount}
        </div>
        <div className="text-xs" style={{ color: '#5C6660' }}>Logs</div>
        {logsGrowth > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" style={{ color: '#34A853' }} />
            <span className="text-xs" style={{ color: '#34A853' }}>+{logsGrowth}%</span>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="stat-card">
        <div className="text-2xl font-bold" style={{ color: '#F1F5F3' }}>
          {skillsCount}
        </div>
        <div className="text-xs" style={{ color: '#5C6660' }}>Skills</div>
        {newSkills > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs" style={{ color: '#34A853' }}>+{newSkills} new</span>
          </div>
        )}
      </div>

      {/* Streak */}
      <div className="stat-card">
        <div className="text-2xl font-bold" style={{ color: '#FBBF24' }}>
          {currentStreak}
        </div>
        <div className="text-xs" style={{ color: '#5C6660' }}>Day Streak</div>
        <div className="text-xs mt-1" style={{ color: '#5C6660' }}>
          Best: {bestStreak}
        </div>
      </div>
    </div>
  )
}
