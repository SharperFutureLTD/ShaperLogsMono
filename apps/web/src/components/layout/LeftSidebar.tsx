'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Pencil, Sparkles, Target, Settings, CreditCard } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  mode: string
  badge?: number
}

interface LeftSidebarProps {
  currentMode: string
  onModeChange: (mode: string) => void
  userName?: string | null
  userEmail?: string | null
}

export function LeftSidebar({
  currentMode,
  onModeChange,
  userName,
}: LeftSidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { id: 'log', label: 'Log', icon: Pencil, mode: 'log' },
    { id: 'generate', label: 'Generate', icon: Sparkles, mode: 'generate' },
    { id: 'progress', label: 'Progress', icon: Target, mode: 'targets' },
  ]

  const isActive = (item: NavItem) => {
    return currentMode === item.mode && pathname === '/'
  }

  // Calculate active index for sliding indicator
  const activeIndex = navItems.findIndex(item => isActive(item))

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
        <Link href="/" className="block px-1">
          <span className="text-base font-bold" style={{ color: '#F1F5F3' }}>
            Sharper Logs
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="mb-1.5 px-1">
          <span
            className="text-xs font-semibold tracking-wider"
            style={{ color: '#5C6660' }}
          >
            MAIN
          </span>
        </div>
        <ul className="space-y-0.5 relative">
          {/* Sliding active indicator */}
          {activeIndex !== -1 && (
            <div
              className="absolute left-0 right-0 rounded-lg transition-transform duration-300 ease-out pointer-events-none"
              style={{
                height: '36px',
                transform: `translateY(${activeIndex * 38}px)`,
                background: 'rgba(52, 168, 83, 0.15)',
              }}
            />
          )}

          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <li key={item.id} className="relative z-10">
                <button
                  onClick={() => onModeChange(item.mode)}
                  className="nav-item"
                  style={{
                    background: 'transparent',
                    color: active ? '#34A853' : '#9CA898',
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: active ? '#34A853' : '#2A332E',
                        color: active ? '#0A0F0D' : '#9CA898'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #2A332E' }}>
        {/* Settings & Billing links */}
        <div className="flex flex-col gap-0.5 mb-3">
          <Link
            href="/settings"
            className="nav-item"
            style={{
              background: pathname === '/settings' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
              color: pathname === '/settings' ? '#34A853' : '#9CA898',
            }}
          >
            <Settings className="h-[18px] w-[18px]" />
            <span>Settings</span>
          </Link>
          <Link
            href="/billing"
            className="nav-item"
            style={{
              background: pathname === '/billing' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
              color: pathname === '/billing' ? '#34A853' : '#9CA898',
            }}
          >
            <CreditCard className="h-[18px] w-[18px]" />
            <span>Billing</span>
          </Link>
        </div>

        {/* Profile link */}
        <Link
          href="/profile"
          className="flex items-center gap-2 px-1 py-1.5 rounded-lg transition-colors hover:bg-[#1C2420]"
          style={{
            background: pathname === '/profile' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs"
            style={{ background: '#34A853', color: '#0A0F0D' }}
          >
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div
              className="font-medium text-sm"
              style={{ color: pathname === '/profile' ? '#34A853' : '#F1F5F3' }}
            >
              {userName || 'User'}
            </div>
            <div className="text-xs" style={{ color: '#34A853' }}>
              Pro
            </div>
          </div>
        </Link>
      </div>
    </aside>
  )
}
