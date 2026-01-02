import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Create Supabase client with service role key
// This bypasses Row Level Security (RLS) - use with caution!
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to create a user-scoped client (respects RLS)
export function createUserClient(accessToken: string) {
  return createClient<Database>(
    supabaseUrl!,
    supabaseServiceRoleKey!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Helper to get user-scoped Supabase client by user ID
// Note: This still uses service role but can be used for user-specific operations
export function getUserSupabase(userId: string) {
  return supabase;
}

// Helper to verify and decode JWT
export async function verifyJWT(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
