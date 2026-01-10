'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil,
  Sparkles,
  Target,
  Menu,
  User,
  LogOut,
  Settings,
  CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  mode?: string
}

const mainNavItems: NavItem[] = [
  { id: 'log', label: 'Log', icon: Pencil, mode: 'log' },
  { id: 'generate', label: 'Generate', icon: Sparkles, mode: 'generate' },
  { id: 'progress', label: 'Progress', icon: Target, mode: 'targets' },
]

interface MobileBottomNavProps {
  currentMode: string
  onModeChange: (mode: string) => void
  userName?: string | null
  userEmail?: string | null
}

export function MobileBottomNav({
  currentMode,
  onModeChange,
  userName,
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const isActive = (item: NavItem) => {
    if (item.mode) {
      return currentMode === item.mode && pathname === '/'
    }
    return false
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: '#141A17', borderTop: '1px solid #2A332E' }}
    >
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <button
              key={item.id}
              onClick={() => item.mode && onModeChange(item.mode)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            >
              <Icon
                className="h-5 w-5"
                style={{ color: active ? '#34A853' : '#5C6660' }}
              />
              <span
                className="text-xs"
                style={{ color: active ? '#34A853' : '#5C6660' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* More menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
              <Menu className="h-5 w-5" style={{ color: '#5C6660' }} />
              <span className="text-xs" style={{ color: '#5C6660' }}>More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto rounded-t-xl"
            style={{ background: '#141A17', border: '1px solid #2A332E' }}
          >
            <div className="py-4 space-y-2">
              {/* User info */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
                style={{ background: '#1C2420' }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ background: '#34A853' }}
                >
                  <span className="text-lg font-medium" style={{ color: '#0A0F0D' }}>
                    {userName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: '#F1F5F3' }}>
                    {userName || 'User'}
                  </p>
                  <p className="text-xs" style={{ color: '#34A853' }}>
                    Pro
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-[#1C2420]"
                style={{
                  background: pathname === '/profile' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
                }}
              >
                <User className="h-5 w-5" style={{ color: pathname === '/profile' ? '#34A853' : '#5C6660' }} />
                <span style={{ color: pathname === '/profile' ? '#34A853' : '#F1F5F3' }}>Profile</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-[#1C2420]"
                style={{
                  background: pathname === '/settings' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
                }}
              >
                <Settings className="h-5 w-5" style={{ color: pathname === '/settings' ? '#34A853' : '#5C6660' }} />
                <span style={{ color: pathname === '/settings' ? '#34A853' : '#F1F5F3' }}>Settings</span>
              </Link>
              <Link
                href="/billing"
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-[#1C2420]"
                style={{
                  background: pathname === '/billing' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
                }}
              >
                <CreditCard className="h-5 w-5" style={{ color: pathname === '/billing' ? '#34A853' : '#5C6660' }} />
                <span style={{ color: pathname === '/billing' ? '#34A853' : '#F1F5F3' }}>Billing</span>
              </Link>
              <div className="my-2 border-t" style={{ borderColor: '#2A332E' }} />
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full hover:bg-[#1C2420]"
              >
                <LogOut className="h-5 w-5" style={{ color: '#EF4444' }} />
                <span style={{ color: '#EF4444' }}>Sign out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
