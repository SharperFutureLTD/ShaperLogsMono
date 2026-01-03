'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { Onboarding } from '@/components/Onboarding'
import { Header } from '@/components/Header'
import { RightSidebar } from '@/components/RightSidebar'
import { ModeToggle, Mode } from '@/components/ModeToggle'
import { LogMode } from '@/components/log/LogMode'
import { GenerateMode } from '@/components/generate/GenerateMode'
import { TargetsMode } from '@/components/targets/TargetsMode'

export default function DashboardPage() {
  const { profile, loading, completeOnboarding, isCompletingOnboarding } = useProfile()
  const [mode, setMode] = useState<Mode>('log')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const getTitle = () => {
    switch (mode) {
      case 'log': return 'Log Your Work';
      case 'generate': return 'Generate Content';
      case 'targets': return 'Track Your Targets';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'log': return 'Tell me what you accomplished today';
      case 'generate': return 'Describe what you need, I\'ll use your history';
      case 'targets': return 'Set and track your professional goals';
    }
  };

  if (loading) return <div className="p-8">Loading...</div>

  const needsOnboarding = !profile?.industry || !profile?.employment_status

  if (needsOnboarding) {
    return <Onboarding onComplete={completeOnboarding} isSubmitting={isCompletingOnboarding} />
  }

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <RightSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="container max-w-2xl mx-auto px-4 pt-24 pb-8">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h2 className="font-sans text-4xl font-bold tracking-tight">
            {getTitle()}
          </h2>
          <p className="mt-3 text-base text-muted-foreground font-mono">
            {getSubtitle()}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex justify-center">
          <ModeToggle mode={mode} onModeChange={setMode} />
        </div>

        {mode === 'log' && <LogMode />}
        {mode === 'generate' && <GenerateMode />}
        {mode === 'targets' && <TargetsMode />}
      </main>
    </>
  )
}
