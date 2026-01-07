'use client'

import { useMemo } from 'react'

interface GreetingHeaderProps {
  name?: string | null
  compact?: boolean
}

export function GreetingHeader({ name, compact = false }: GreetingHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const subtitle = useMemo(() => {
    const subtitles = [
      "Ready to capture today's work?",
      "What did you accomplish today?",
      "Let's log your achievements.",
      "Your career story continues...",
    ]
    return subtitles[Math.floor(Math.random() * subtitles.length)]
  }, [])

  const displayName = name || 'there'

  if (compact) {
    return (
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">
          {greeting}, {displayName}
        </h1>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
        {greeting}, {displayName}
      </h1>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
    </div>
  )
}
