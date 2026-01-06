"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSubscription, useBillingHistory } from "@/hooks/useSubscription";

// Initialize Stripe Promise
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Dark theme appearance configuration
const DARK_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#22c55e", // Terminal green accent
    colorBackground: "#0a0a0a", // App background
    colorText: "#f2f2f2", // App foreground text
    colorDanger: "#ef4444", // Red for errors
    colorTextSecondary: "#a3a3a3", // Muted text
    colorBorder: "#262626", // Border color
    fontFamily: "Geist Mono, ui-monospace, monospace",
    fontSizeBase: "13px",
    fontWeightNormal: "400",
    borderRadius: "4px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #262626",
      backgroundColor: "#0f0f0f",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid #22c55e",
      boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.2)",
      outline: "none",
    },
    ".Label": {
      color: "#f2f2f2",
      fontSize: "13px",
      fontWeight: "500",
    },
    ".Tab": {
      border: "1px solid #262626",
      backgroundColor: "#0f0f0f",
    },
    ".Tab:hover": {
      backgroundColor: "#1a1a1a",
    },
    ".Tab--selected": {
      borderColor: "#22c55e",
      backgroundColor: "#0f0f0f",
    },
  },
};

// Checkout Form Component
function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing?success=true`,
        },
      });

      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        onSuccess();
      }
    } catch (err) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full font-mono"
      >
        {isProcessing ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
    if (success === "true") {
      toast.success("Subscription successful! Welcome to premium.");
      router.replace("/billing");
    }
  }, [searchParams, router]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { clientSecret } = await apiClient.createSubscription();
      if (clientSecret) {
        setClientSecret(clientSecret);
        setIsCheckoutOpen(true);
      } else {
        throw new Error("No client secret returned");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { url } = await apiClient.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal.");
    } finally {
      setLoading(false);
    }
  };

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
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">
            Subscription
          </h2>
          <p className="font-mono text-sm text-foreground">
            Manage your subscription and billing details.
          </p>
        </section>

        {/* Active Subscription Card */}
        {hasSubscription && (
          <section>
            <h2 className="font-mono text-xs text-muted-foreground mb-2">
              Current Subscription
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Active Subscription
                </CardTitle>
                <CardDescription>
                  {cancelAtPeriodEnd
                    ? `Cancels on ${new Date(
                        currentPeriodEnd! * 1000
                      ).toLocaleDateString()}`
                    : `Renews on ${new Date(
                        currentPeriodEnd! * 1000
                      ).toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">£1.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cancelAtPeriodEnd
                    ? "Your subscription is scheduled to cancel. You'll have access until the end of your billing period."
                    : "Your subscription is active. You have full access to all premium features."}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4">
                {!cancelAtPeriodEnd && (
                  <Button
                    variant="destructive"
                    onClick={() => cancelSubscription()}
                    disabled={isCancelling}
                    className="w-full sm:w-auto font-mono"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleManage}
                  className="w-full sm:w-auto font-mono"
                >
                  Manage Billing
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {/* Available Plans - Only show when not subscribed */}
        {!hasSubscription && (
          <section>
            <h2 className="font-mono text-xs text-muted-foreground mb-2">
              Available Plans
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Pro Plan</CardTitle>
                <CardDescription>
                  Unlock unlimited AI generations and advanced features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">£1.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Unlimited AI Generation (Claude, GPT-4)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Priority Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Advanced Analytics</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full sm:w-auto font-mono"
                >
                  {loading ? "Processing..." : "Subscribe Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={loading}
                  className="w-full sm:w-auto font-mono"
                >
                  Manage Subscription
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {/* Billing History */}
        {hasSubscription &&
          billingHistory &&
          billingHistory.invoices.length > 0 && (
            <section>
              <h2 className="font-mono text-xs text-muted-foreground mb-2">
                Billing History
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Your recent billing history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {billingHistory.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-border rounded-md"
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
                </CardContent>
              </Card>
            </section>
          )}
      </main>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-mono">
              Complete Subscription
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Secure payment via Stripe - £1.99/month
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-0">
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: DARK_APPEARANCE,
                }}
              >
                <CheckoutForm onSuccess={() => setIsCheckoutOpen(false)} />
              </Elements>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
