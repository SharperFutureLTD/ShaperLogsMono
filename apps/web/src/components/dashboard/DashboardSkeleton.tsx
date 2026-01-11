'use client'

import { Lock } from 'lucide-react'

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`bg-[#2A332E] rounded animate-pulse ${className || ''}`} />
}

function LeftSidebarSkeleton() {
  return (
    <aside
      className="hidden md:flex md:flex-col h-screen sticky top-0"
      style={{
        width: '180px',
        background: '#141A17',
        borderRight: '1px solid #2A332E'
      }}
    >
      {/* Logo */}
      <div className="py-4 px-3">
        <SkeletonBox className="h-5 w-28" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="mb-1.5 px-1">
          <SkeletonBox className="h-3 w-10" />
        </div>
        <ul className="space-y-0.5">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <div className="flex items-center gap-2 px-2 py-2">
                <SkeletonBox className="h-[18px] w-[18px]" />
                <SkeletonBox className="h-4 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #2A332E' }}>
        <div className="flex flex-col gap-0.5 mb-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <SkeletonBox className="h-[18px] w-[18px]" />
              <SkeletonBox className="h-4 w-14" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <SkeletonBox className="w-7 h-7 rounded-full" />
          <div className="space-y-1">
            <SkeletonBox className="h-4 w-16" />
            <SkeletonBox className="h-3 w-8" />
          </div>
        </div>
      </div>
    </aside>
  )
}

function GreetingHeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-48" />
          <SkeletonBox className="h-4 w-56" />
        </div>
        <SkeletonBox className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}

function ConversationBoxSkeleton() {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#141A17', border: '1px solid #2A332E' }}
    >
      <SkeletonBox className="h-4 w-40 mb-3" />
      <SkeletonBox className="h-24 w-full rounded-lg mb-3" />
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-32" />
        <SkeletonBox className="h-10 w-10 rounded-full" />
      </div>
    </div>
  )
}

function RecentLogsSkeleton() {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox className="h-5 w-24" />
      </div>

      {/* Search bar skeleton */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
        style={{ background: '#1C2420', border: '1px solid #2A332E' }}
      >
        <SkeletonBox className="h-4 w-4" />
        <SkeletonBox className="h-4 w-24" />
      </div>

      {/* Log entry cards */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: '#141A17',
              borderLeft: '3px solid #2A332E'
            }}
          >
            <SkeletonBox className="h-4 w-full mb-2" />
            <SkeletonBox className="h-4 w-3/4 mb-3" />
            <div className="flex gap-2">
              <SkeletonBox className="h-5 w-16 rounded-full" />
              <SkeletonBox className="h-5 w-20 rounded-full" />
              <SkeletonBox className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StreakWidgetSkeleton() {
  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">YOUR STREAK</span>
      </div>
      <div className="streak-card relative">
        <div className="animate-pulse">
          <div className="absolute top-3 left-3">
            <SkeletonBox className="h-7 w-7" />
          </div>
          <div className="space-y-2 py-2 text-center">
            <SkeletonBox className="h-10 w-10 mx-auto" />
            <SkeletonBox className="h-4 w-16 mx-auto" />
          </div>
          <div className="my-3 mx-4" style={{ borderTop: '1px solid #2A332E' }} />
          <div className="flex justify-center gap-8">
            <div className="space-y-1">
              <SkeletonBox className="h-4 w-6 mx-auto" />
              <SkeletonBox className="h-3 w-8 mx-auto" />
            </div>
            <div className="space-y-1">
              <SkeletonBox className="h-4 w-6 mx-auto" />
              <SkeletonBox className="h-3 w-8 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightsWidgetSkeleton() {
  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">THIS MONTH</span>
        <span className="section-action">Insights →</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="stat-card animate-pulse">
          <SkeletonBox className="h-6 w-8 mb-1" />
          <SkeletonBox className="h-3 w-12" />
        </div>
        <div className="stat-card animate-pulse">
          <SkeletonBox className="h-6 w-8 mb-1" />
          <SkeletonBox className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

function TargetsWidgetSkeleton() {
  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">TARGETS</span>
        <span className="section-action">All →</span>
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="target-card animate-pulse"
          >
            <div className="flex items-center justify-between mb-2">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-5 w-16 rounded-full" />
            </div>
            <SkeletonBox className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickGenerateWidgetSkeleton() {
  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">QUICK GENERATE</span>
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: '#1C2420' }}
          >
            <SkeletonBox className="h-4 w-4" />
            <SkeletonBox className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

function RightSidebarSkeleton() {
  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 p-4 gap-6"
      style={{
        width: '240px',
        background: '#141A17',
        borderLeft: '1px solid #2A332E'
      }}
    >
      <StreakWidgetSkeleton />
      <InsightsWidgetSkeleton />
      <TargetsWidgetSkeleton />
      <QuickGenerateWidgetSkeleton />

      {/* Security Badge */}
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
  )
}

function MobileBottomNavSkeleton() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: '#141A17', borderTop: '1px solid #2A332E' }}
    >
      <div className="flex items-center justify-around h-16">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 flex-1">
            <SkeletonBox className="h-5 w-5" />
            <SkeletonBox className="h-3 w-12" />
          </div>
        ))}
      </div>
    </nav>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen" style={{ background: '#0A0F0D' }}>
      {/* Desktop left sidebar */}
      <LeftSidebarSkeleton />

      {/* Main content area */}
      <main className="flex-1 p-5 overflow-auto pb-20 md:pb-5">
        <GreetingHeaderSkeleton />
        <div className="space-y-6">
          <ConversationBoxSkeleton />
          <RecentLogsSkeleton />
        </div>

        {/* Mobile widgets */}
        <div className="lg:hidden mt-8 space-y-4">
          <StreakWidgetSkeleton />
          <InsightsWidgetSkeleton />
          <TargetsWidgetSkeleton />
          <QuickGenerateWidgetSkeleton />
        </div>
      </main>

      {/* Desktop right sidebar */}
      <RightSidebarSkeleton />

      {/* Mobile bottom nav */}
      <MobileBottomNavSkeleton />
    </div>
  )
}
