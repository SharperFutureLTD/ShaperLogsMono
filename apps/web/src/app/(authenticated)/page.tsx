'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { Onboarding } from '@/components/Onboarding'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { StreakWidget } from '@/components/dashboard/StreakWidget'
import { InsightsWidget } from '@/components/dashboard/InsightsWidget'
import { ActiveTargetsPreview } from '@/components/dashboard/ActiveTargetsPreview'
import { LogMode } from '@/components/log/LogMode'
import { GenerateMode } from '@/components/generate/GenerateMode'
import { TargetsMode } from '@/components/targets/TargetsMode'

type Mode = 'log' | 'generate' | 'targets'

export default function DashboardPage() {
  const { profile, loading, completeOnboarding, isCompletingOnboarding } = useProfile()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('log')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const needsOnboarding = !profile?.industry || !profile?.employment_status

  if (needsOnboarding) {
    return <Onboarding onComplete={completeOnboarding} isSubmitting={isCompletingOnboarding} />
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <LeftSidebar
        currentMode={mode}
        onModeChange={(newMode) => setMode(newMode as Mode)}
        userName={displayName}
        userEmail={user?.email}
      />

      {/* Main content area */}
      <div className="flex-1 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          {/* Desktop: Grid layout with main content and widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content column */}
            <div className="lg:col-span-2">
              {/* Greeting */}
              <GreetingHeader name={displayName} />

              {/* Mode content */}
              <div className="space-y-6">
                {mode === 'log' && <LogMode />}
                {mode === 'generate' && <GenerateMode />}
                {mode === 'targets' && <TargetsMode />}
              </div>
            </div>

            {/* Right widgets column - desktop only */}
            <div className="hidden lg:block space-y-4">
              <StreakWidget />
              <InsightsWidget />
              {mode !== 'targets' && (
                <ActiveTargetsPreview
                  onViewAll={() => setMode('targets')}
                  limit={3}
                />
              )}
            </div>
          </div>

          {/* Mobile widgets - shown at bottom of main content */}
          <div className="lg:hidden mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StreakWidget />
              <InsightsWidget />
            </div>
            {mode !== 'targets' && (
              <ActiveTargetsPreview
                onViewAll={() => setMode('targets')}
                limit={2}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav
        currentMode={mode}
        onModeChange={(newMode) => setMode(newMode as Mode)}
        userName={displayName}
        userEmail={user?.email}
      />
    </div>
  )
}
