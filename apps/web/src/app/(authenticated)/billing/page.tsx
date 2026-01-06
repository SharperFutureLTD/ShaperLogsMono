"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { useSubscription, useBillingHistory } from "@/hooks/useSubscription";

// Initialize Stripe Promise
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCheckout, setShowCheckout] = useState(false);

  const {
    hasSubscription,
    isActive,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    cancelSubscription,
    isCancelling,
  } = useSubscription();
  const { data: billingHistory } = useBillingHistory();

  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    if (success === "true" || sessionId) {
      toast.success("Subscription successful! Welcome to Pro.");
      router.replace("/billing");
    }
  }, [searchParams, router]);

  const fetchClientSecret = useCallback(async () => {
    const { clientSecret } = await apiClient.createCheckoutSession();
    return clientSecret;
  }, []);

  const handleManage = async () => {
    try {
      const { url } = await apiClient.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal.");
    }
  };

  // Show embedded checkout
  if (showCheckout) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCheckout(false)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-mono text-sm font-medium">Subscribe to Pro</h1>
          </div>
        </header>

        {/* Checkout */}
        <main className="max-w-3xl mx-auto px-4 py-8">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-mono text-sm font-medium">Billing</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section className="space-y-2">
          <h2 className="font-mono text-xs text-muted-foreground">
            Subscription
          </h2>
          <p className="font-mono text-sm text-foreground">
            Manage your subscription and billing details.
          </p>
        </section>

        {/* Active Subscription */}
        {hasSubscription && (
          <section className="space-y-4">
            <h2 className="font-mono text-xs text-muted-foreground">
              Current Subscription
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-mono text-sm font-medium">
                  Active Subscription
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {cancelAtPeriodEnd
                  ? `Cancels on ${new Date(
                      currentPeriodEnd! * 1000
                    ).toLocaleDateString()}`
                  : `Renews on ${new Date(
                      currentPeriodEnd! * 1000
                    ).toLocaleDateString()}`}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono">£1.99</span>
                <span className="text-muted-foreground font-mono text-sm">/month</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {cancelAtPeriodEnd
                  ? "Your subscription is scheduled to cancel. You'll have access until the end of your billing period."
                  : "Your subscription is active. You have full access to all premium features."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!cancelAtPeriodEnd && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelSubscription()}
                    disabled={isCancelling}
                    className="font-mono"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManage}
                  className="font-mono"
                >
                  Manage Billing
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Available Plans - Only show when not subscribed */}
        {!hasSubscription && (
          <section className="space-y-4">
            <h2 className="font-mono text-xs text-muted-foreground">
              Available Plans
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-mono text-lg font-semibold">Pro Plan</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Unlock unlimited AI generations and advanced features.
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono">£1.99</span>
                <span className="text-muted-foreground font-mono text-sm">/month</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 font-mono text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited AI Generation (Claude, GPT-4)</span>
                </li>
                <li className="flex items-center gap-2 font-mono text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Priority Support</span>
                </li>
                <li className="flex items-center gap-2 font-mono text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Advanced Analytics</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => setShowCheckout(true)}
                  className="font-mono"
                >
                  Subscribe Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManage}
                  className="font-mono"
                >
                  Manage Subscription
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Billing History */}
        {hasSubscription &&
          billingHistory &&
          billingHistory.invoices.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-mono text-xs text-muted-foreground">
                Billing History
              </h2>
              <div className="space-y-2">
                {billingHistory.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-border rounded-md"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <div>
                        <p className="font-mono text-sm">
                          {new Date(
                            invoice.created * 1000
                          ).toLocaleDateString()}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {invoice.status}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold sm:hidden">
                        {(invoice.amountPaid / 100).toFixed(2)}{" "}
                        {invoice.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="font-mono text-sm font-bold hidden sm:inline">
                        {(invoice.amountPaid / 100).toFixed(2)}{" "}
                        {invoice.currency.toUpperCase()}
                      </span>
                      {invoice.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(invoice.invoicePdf, "_blank")
                          }
                          className="font-mono text-xs"
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
      </main>
    </div>
  );
}
