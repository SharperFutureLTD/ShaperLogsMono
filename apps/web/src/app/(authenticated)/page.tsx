'use client'

import { useState, useRef, useEffect } from 'react'
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
import { Lock, ChevronRight, ChevronLeft } from 'lucide-react'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

type Mode = 'log' | 'generate' | 'targets'

const SIDEBAR_COLLAPSED_KEY = 'sharper-logs-sidebar-collapsed'

export default function DashboardPage() {
  const { profile, loading, completeOnboarding, isCompletingOnboarding } = useProfile()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('log')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const mainContentRef = useRef<HTMLElement>(null)

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  const handleNewLog = () => {
    // Scroll to top where the conversation box is
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    // Focus the first input we can find in LogMode
    setTimeout(() => {
      const textarea = mainContentRef.current?.querySelector('textarea')
      textarea?.focus()
    }, 300)
  }

  if (loading) {
    return <DashboardSkeleton />
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
      <main ref={mainContentRef} className="flex-1 p-5 overflow-auto pb-20 md:pb-5">
        {/* Greeting header with mode-specific subtitle */}
        <GreetingHeader
          name={displayName}
          mode={mode}
          onNewLog={handleNewLog}
        />

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

      {/* Right panel - 240px (desktop only) with collapse toggle */}
      <div className="hidden lg:flex relative">
        {/* Collapse/Expand toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -left-3 top-6 z-10 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:scale-110"
          style={{
            background: '#1C2420',
            border: '1px solid #2A332E',
            color: '#9CA898'
          }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <aside
          className="flex flex-col h-screen sticky top-0 p-4 gap-6 transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: sidebarCollapsed ? '0px' : '240px',
            padding: sidebarCollapsed ? '0' : '1rem',
            background: '#141A17',
            borderLeft: sidebarCollapsed ? 'none' : '1px solid #2A332E',
            opacity: sidebarCollapsed ? 0 : 1
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
