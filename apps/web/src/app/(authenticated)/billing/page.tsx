'use client'

import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Download, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="font-mono"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold font-mono">Billing</h1>
        </div>

        {/* Current Plan */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold font-mono">Current Plan</h2>
            </div>
            <Badge variant="default" className="font-mono">Free</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                You're currently on the Free plan with unlimited work entries and AI generations.
              </p>
            </div>
            <Button variant="default" className="font-mono">
              Upgrade to Pro
            </Button>
          </div>
        </Card>

        {/* Usage */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold font-mono">Usage This Month</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Work Entries</span>
              <span className="font-mono">Unlimited</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">AI Generations</span>
              <span className="font-mono">Unlimited</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Storage</span>
              <span className="font-mono">Unlimited</span>
            </div>
          </div>
        </Card>

        {/* Billing History */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold font-mono">Billing History</h2>
          </div>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground font-mono">
              No billing history available
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
