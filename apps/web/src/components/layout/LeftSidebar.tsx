'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  Sparkles,
  Target,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  mode?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'log', label: 'Log', icon: MessageSquare, mode: 'log' },
      { id: 'generate', label: 'Generate', icon: Sparkles, mode: 'generate' },
      { id: 'progress', label: 'Progress', icon: Target, mode: 'targets' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
      { id: 'help', label: 'Help', icon: HelpCircle, href: '/help' },
    ],
  },
]

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
  userEmail
}: LeftSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleNavClick = (item: NavItem) => {
    if (item.mode) {
      onModeChange(item.mode)
    }
  }

  const isActive = (item: NavItem) => {
    if (item.href) {
      return pathname === item.href
    }
    if (item.mode) {
      return currentMode === item.mode && pathname === '/'
    }
    return false
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-sidebar-foreground">
            Sharper Logs
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item)

                if (item.href) {
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-primary'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </li>
                  )
                }

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavClick(item)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left',
                        active
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {userName || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
