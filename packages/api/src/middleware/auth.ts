import { Context, Next } from 'hono';
import { verifyJWT } from '../db/client';
import type { User } from '@supabase/supabase-js';

// Extend Hono's context to include user
export type AuthContext = {
  Variables: {
    user: User;
    userId: string;
    token: string;
  };
};

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 * Adds user object to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        status: 401,
      },
      401
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const user = await verifyJWT(token);

  if (!user) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        status: 401,
      },
      401
    );
  }

  // Set user in context for route handlers
  c.set('user', user);
  c.set('userId', user.id);
  c.set('token', token);

  await next();
}

/**
 * Optional auth middleware
 * Validates JWT if present, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await verifyJWT(token);

    if (user) {
      c.set('user', user);
      c.set('userId', user.id);
      c.set('token', token);
    }
  }

  await next();
}
