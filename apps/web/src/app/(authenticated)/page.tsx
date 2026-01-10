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
import { QuickGenerateWidget } from '@/components/dashboard/QuickGenerateWidget'
import { LogMode } from '@/components/log/LogMode'
import { GenerateMode } from '@/components/generate/GenerateMode'
import { TargetsMode } from '@/components/targets/TargetsMode'
import { Lock } from 'lucide-react'

type Mode = 'log' | 'generate' | 'targets'

export default function DashboardPage() {
  const { profile, loading, completeOnboarding, isCompletingOnboarding } = useProfile()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('log')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0A0F0D' }}>
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p style={{ color: '#5C6660' }}>Loading...</p>
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
    <div className="flex min-h-screen" style={{ background: '#0A0F0D' }}>
      {/* Desktop sidebar - 180px */}
      <LeftSidebar
        currentMode={mode}
        onModeChange={(newMode) => setMode(newMode as Mode)}
        userName={displayName}
        userEmail={user?.email}
      />

      {/* Main content area - flex-1 */}
      <main className="flex-1 p-5 overflow-auto pb-20 md:pb-5">
        {/* Greeting header with mode-specific subtitle */}
        <GreetingHeader name={displayName} mode={mode} />

        {/* Mode content */}
        <div className="space-y-6">
          {mode === 'log' && <LogMode />}
          {mode === 'generate' && <GenerateMode />}
          {mode === 'targets' && <TargetsMode />}
        </div>

        {/* Mobile widgets - shown at bottom of main content */}
        <div className="lg:hidden mt-8 space-y-4">
          <StreakWidget />
          <InsightsWidget onViewInsights={() => setMode('targets')} />
          {mode !== 'targets' && (
            <ActiveTargetsPreview
              onViewAll={() => setMode('targets')}
              limit={2}
            />
          )}
          <QuickGenerateWidget onSelectType={(type) => {
            setMode('generate')
          }} />
        </div>
      </main>

      {/* Right panel - 240px (desktop only) */}
      <aside
        className="hidden lg:flex lg:flex-col h-screen sticky top-0 p-4 gap-4"
        style={{
          width: '240px',
          background: '#141A17',
          borderLeft: '1px solid #2A332E'
        }}
      >
        {/* Streak Widget */}
        <StreakWidget />

        {/* This Month / Insights Widget */}
        <InsightsWidget onViewInsights={() => setMode('targets')} />

        {/* Targets Preview */}
        {mode !== 'targets' && (
          <ActiveTargetsPreview
            onViewAll={() => setMode('targets')}
            limit={2}
          />
        )}

        {/* Quick Generate */}
        <QuickGenerateWidget onSelectType={(type) => {
          setMode('generate')
        }} />

        {/* Security Badge - at bottom */}
        <div className="mt-auto">
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{ background: 'rgba(52, 168, 83, 0.08)' }}
          >
            <Lock className="h-3 w-3" style={{ color: '#9CA898' }} />
            <span className="text-xs" style={{ color: '#9CA898' }}>
              Encrypted & secure
            </span>
          </div>
        </div>
      </aside>

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
