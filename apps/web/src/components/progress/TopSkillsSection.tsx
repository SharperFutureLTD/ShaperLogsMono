'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface SkillData {
  name: string
  count: number
  growth: number // Positive = trending up, negative = trending down, 0 = stable
}

interface TopSkillsSectionProps {
  skills: SkillData[]
}

export function TopSkillsSection({ skills }: TopSkillsSectionProps) {
  if (skills.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
          Top Skills This Month
        </h3>
        <div className="empty-card">
          <p className="text-sm" style={{ color: '#5C6660' }}>
            No skills tracked yet. Start logging your work to build your skill profile.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
        Top Skills This Month
      </h3>

      <div className="space-y-2">
        {skills.slice(0, 5).map((skill, index) => (
          <div
            key={skill.name}
            className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:translate-x-1"
            style={{ background: '#1C2420', border: '1px solid #2A332E' }}
          >
            {/* Rank */}
            <span
              className="text-sm font-bold w-6 text-center"
              style={{ color: index === 0 ? '#34A853' : '#5C6660' }}
            >
              {index + 1}
            </span>

            {/* Skill name */}
            <span className="flex-1 text-sm" style={{ color: '#F1F5F3' }}>
              {skill.name}
            </span>

            {/* Count */}
            <span className="text-sm" style={{ color: '#5C6660' }}>
              {skill.count} {skill.count === 1 ? 'log' : 'logs'}
            </span>

            {/* Growth indicator */}
            {skill.growth > 0 ? (
              <TrendingUp className="h-4 w-4" style={{ color: '#34A853' }} />
            ) : skill.growth < 0 ? (
              <TrendingDown className="h-4 w-4" style={{ color: '#F59E0B' }} />
            ) : (
              <Minus className="h-4 w-4" style={{ color: '#5C6660' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
