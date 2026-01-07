'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  Sparkles,
  Target,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Settings, HelpCircle, LogOut, User } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  mode?: string
}

const mainNavItems: NavItem[] = [
  { id: 'log', label: 'Log', icon: MessageSquare, mode: 'log' },
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
  userEmail
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <button
              key={item.id}
              onClick={() => item.mode && onModeChange(item.mode)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}

        {/* More menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground">
              <Menu className="h-5 w-5" />
              <span className="text-xs">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl">
            <div className="py-4 space-y-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-lg mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-medium text-primary">
                    {userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {userName || 'User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                <span>Help</span>
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
