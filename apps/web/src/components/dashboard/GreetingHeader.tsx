'use client'

import { useMemo } from 'react'
import { Plus } from 'lucide-react'

interface GreetingHeaderProps {
  name?: string | null
  mode?: 'log' | 'generate' | 'targets'
  compact?: boolean
  onNewLog?: () => void
}

export function GreetingHeader({ name, mode = 'log', compact = false, onNewLog }: GreetingHeaderProps) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#F1F5F3' }}>
            {greeting}, {displayName}
          </h1>
          <p className="text-sm" style={{ color: '#9CA898' }}>{subtitle}</p>
        </div>
        {mode === 'log' && onNewLog && (
          <button onClick={onNewLog} className="btn-primary flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Log
          </button>
        )}
      </div>
    </div>
  )
}
