'use client'

import { useMemo } from 'react'

interface GreetingHeaderProps {
  name?: string | null
  mode?: 'log' | 'generate' | 'targets'
  compact?: boolean
}

export function GreetingHeader({ name, mode = 'log', compact = false }: GreetingHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const subtitle = useMemo(() => {
    switch (mode) {
      case 'log':
        return "Ready to capture today's work?"
      case 'generate':
        return "Your career story continues..."
      case 'targets':
        return "Track your growth and achievements"
      default:
        return "Ready to capture today's work?"
    }
  }, [mode])

  const displayName = name || 'there'

  if (compact) {
    return (
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#F1F5F3' }}>
          {greeting}, {displayName}
        </h1>
      </div>
    )
  }

  // For targets mode, we want a different title
  if (mode === 'targets') {
    return (
      <div className="mb-5">
        <h1 className="text-lg font-semibold" style={{ color: '#F1F5F3' }}>
          Your Progress
        </h1>
        <p className="text-sm" style={{ color: '#9CA898' }}>{subtitle}</p>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <h1 className="text-lg font-semibold" style={{ color: '#F1F5F3' }}>
        {greeting}, {displayName}
      </h1>
      <p className="text-sm" style={{ color: '#9CA898' }}>{subtitle}</p>
    </div>
  )
}
