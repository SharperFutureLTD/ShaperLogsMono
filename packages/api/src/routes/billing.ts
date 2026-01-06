// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import Stripe from 'stripe';

const app = new OpenAPIHono<AuthContext>();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️ STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Zod schemas
const CreateCheckoutSessionSchema = z.object({
  priceId: z.string().optional(), // Allow overriding price ID, but default to env/hardcoded
});

const CheckoutSessionResponseSchema = z.object({
  clientSecret: z.string(),
});

const PortalSessionResponseSchema = z.object({
  url: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number(),
});

// POST /api/billing/create-checkout-session - Create Stripe Checkout Session
const createCheckoutSessionRoute = createRoute({
  method: 'post',
  path: '/api/billing/create-checkout-session',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCheckoutSessionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Checkout session created',
      content: {
        'application/json': {
          schema: CheckoutSessionResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createCheckoutSessionRoute, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('user').email || '';

    let customerId: string | undefined;

    // Try to find existing customer in Stripe by email
    if (userEmail) {
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });
        if (customers.data.length > 0) {
            customerId = customers.data[0]!.id;
        }
    }

    if (!customerId) {
        // Create new customer
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
                supabase_user_id: userId,
            },
        });
        customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product: 'prod_TihVo452rU54SB',
            unit_amount: 199, // £1.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      ui_mode: 'embedded',
      return_url: `${FRONTEND_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ['card', 'link'],
      metadata: {
          supabase_user_id: userId
      }
    });

    if (!session.client_secret) {
        throw new Error('Failed to create checkout session client secret');
    }

    return c.json({ clientSecret: session.client_secret });

  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return c.json({ 
        error: 'Stripe Error', 
        message: error instanceof Error ? error.message : 'Failed to create checkout session', 
        status: 500 
    }, 500);
  }
});

// POST /api/billing/create-subscription - Create Subscription with Payment Element
const createSubscriptionRoute = createRoute({
  method: 'post',
  path: '/api/billing/create-subscription',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCheckoutSessionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Subscription created',
      content: {
        'application/json': {
          schema: CheckoutSessionResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createSubscriptionRoute, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('user').email || '';

    let customerId: string | undefined;

    // Try to find existing customer in Stripe by email
    if (userEmail) {
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });
        if (customers.data.length > 0) {
            customerId = customers.data[0]!.id;
        }
    }

    if (!customerId) {
        // Create new customer
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
                supabase_user_id: userId,
            },
        });
        customerId = customer.id;
    }

    // Create a Price for the subscription
    const price = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: 199, // £1.99
      recurring: {
        interval: 'month',
      },
      product: 'prod_TihVo452rU54SB',
    });

    // Create subscription with incomplete status
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: price.id,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'link'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: userId,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent;
    };
    const paymentIntent = invoice.payment_intent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent for subscription');
    }

    return c.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id
    });

  } catch (error) {
    console.error('Stripe Subscription Error:', error);
    return c.json({
        error: 'Stripe Error',
        message: error instanceof Error ? error.message : 'Failed to create subscription',
        status: 500
    }, 500);
  }
});

// POST /api/billing/portal - Create Customer Portal Session
const createPortalSessionRoute = createRoute({
  method: 'post',
  path: '/api/billing/portal',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'Portal session created',
      content: {
        'application/json': {
          schema: PortalSessionResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createPortalSessionRoute, async (c) => {
    try {
        const userEmail = c.get('user').email || '';

        // Find customer
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return c.json({ error: 'Not Found', message: 'No billing account found', status: 404 }, 404);
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customers.data[0]!.id,
            return_url: `${FRONTEND_URL}/billing`,
        });

        return c.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Portal Error:', error);
        return c.json({ 
            error: 'Stripe Error', 
            message: error instanceof Error ? error.message : 'Failed to create portal session', 
            status: 500 
        }, 500);
    }
});

// GET /api/billing/subscription - Get Subscription Status
const getSubscriptionRoute = createRoute({
  method: 'get',
  path: '/api/billing/subscription',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'Subscription details',
      content: {
        'application/json': {
          schema: z.object({
            hasSubscription: z.boolean(),
            status: z.string().optional(),
            currentPeriodEnd: z.number().optional(),
            cancelAtPeriodEnd: z.boolean().optional(),
            subscriptionId: z.string().optional(),
          }),
        },
      },
    },
  },
});

app.openapi(getSubscriptionRoute, async (c) => {
  try {
    const userEmail = c.get('user').email || '';

    // Find customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return c.json({
        hasSubscription: false,
      });
    }

    const customerId = customers.data[0]!.id;

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return c.json({
        hasSubscription: false,
      });
    }

    const subscription = subscriptions.data[0]!;

    return c.json({
      hasSubscription: true,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end as number,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Get Subscription Error:', error);
    return c.json({
      hasSubscription: false,
    });
  }
});

// POST /api/billing/cancel-subscription - Cancel Subscription
const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/api/billing/cancel-subscription',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'Subscription cancelled',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            cancelAtPeriodEnd: z.boolean(),
          }),
        },
      },
    },
    404: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(cancelSubscriptionRoute, async (c) => {
  try {
    const userEmail = c.get('user').email || '';

    // Find customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return c.json({ error: 'Customer not found', status: 404 }, 404);
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0]!.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return c.json({ error: 'No active subscription', status: 404 }, 404);
    }

    const subscription = subscriptions.data[0]!;

    // Cancel at end of period (don't immediately revoke access)
    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    return c.json({
      success: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return c.json({
      error: 'Failed to cancel subscription',
      status: 500,
    }, 500);
  }
});

// GET /api/billing/invoices - Get Billing History
const getInvoicesRoute = createRoute({
  method: 'get',
  path: '/api/billing/invoices',
  tags: ['Billing'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'Invoice history',
      content: {
        'application/json': {
          schema: z.object({
            invoices: z.array(z.object({
              id: z.string(),
              amountPaid: z.number(),
              currency: z.string(),
              created: z.number(),
              status: z.string(),
              invoicePdf: z.string().optional(),
            })),
          }),
        },
      },
    },
  },
});

app.openapi(getInvoicesRoute, async (c) => {
  try {
    const userEmail = c.get('user').email || '';

    // Find customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return c.json({ invoices: [] });
    }

    // Get invoices
    const invoices = await stripe.invoices.list({
      customer: customers.data[0]!.id,
      limit: 10,
    });

    return c.json({
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        status: invoice.status || 'unknown',
        invoicePdf: invoice.invoice_pdf || undefined,
      })),
    });
  } catch (error) {
    console.error('Get Invoices Error:', error);
    return c.json({ invoices: [] });
  }
});

export default app;
