'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  if (!user) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-mono text-sm font-medium">settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Account Settings */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">account</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-mono text-muted-foreground block mb-1">email</Label>
              <p className="font-mono text-sm">{user.email}</p>
            </div>
            <div>
              <Label className="text-sm font-mono text-muted-foreground block mb-1">user id</Label>
              <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-4">notifications</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-normal">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications about your activity</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-normal">Weekly Digest</Label>
                <p className="text-xs text-muted-foreground">Get a summary of your week every Monday</p>
              </div>
              <Switch
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">privacy & security</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-mono text-muted-foreground block mb-1">encryption</Label>
              <p className="text-sm">All your data is encrypted client-side using AES-256-GCM.</p>
            </div>
            <Button variant="outline" className="font-mono w-full sm:w-auto h-9">
              Change Password
            </Button>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">preferences</h2>
          <div>
            <Button
              variant="outline"
              onClick={() => router.push('/profile')}
              className="font-mono w-full sm:w-auto h-9"
            >
              Edit Profile
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
