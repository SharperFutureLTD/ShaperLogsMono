'use client'

import { useRouter } from "next/navigation";
import { X, User, Settings, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RightSidebar({ isOpen, onClose }: RightSidebarProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleProfileClick = () => {
    router.push('/profile');
    onClose();
  };

  const handleSettingsClick = () => {
    router.push('/settings');
    onClose();
  };

  const handleBillingClick = () => {
    router.push('/billing');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 z-50 h-full w-72 border-l border-border bg-card slide-in-right">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="font-mono text-sm text-muted-foreground">menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="border-b border-border p-4">
            <p className="font-mono text-xs text-muted-foreground">logged in as</p>
            <p className="mt-1 font-mono text-sm text-foreground truncate">
              {user?.email}
            </p>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={handleProfileClick}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">profile</span>
            </button>
            <button
              onClick={handleSettingsClick}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">settings</span>
            </button>
            <button
              onClick={handleBillingClick}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">billing</span>
            </button>
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <Button
              variant="outline"
              className="w-full font-mono text-sm"
              onClick={handleSignOut}
            >
              [logout]
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
