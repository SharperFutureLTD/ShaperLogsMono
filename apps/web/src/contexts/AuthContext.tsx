'use client'

import { useState, useEffect, useRef, createContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query/config";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * SECURITY: Clear all user-specific data from cache and storage
 * Called on logout to prevent data leakage between users
 */
function clearUserData(userId?: string) {
  // Clear React Query cache completely
  queryClient.clear();

  // Clear sessionStorage (all keys for safety)
  if (typeof window !== 'undefined') {
    sessionStorage.clear();

    // Clear encryption keys from localStorage
    if (userId) {
      localStorage.removeItem(`encryption_salt_${userId}`);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id ?? null;
        const previousUserId = previousUserIdRef.current;

        // SECURITY: Clear data on logout or user switch
        // When user logs out, session becomes null
        if (!session && previousUserId) {
          clearUserData(previousUserId);
        } else if (event === 'SIGNED_IN' && previousUserId && newUserId !== previousUserId) {
          // User switched accounts without explicit logout
          console.warn('User switch detected, clearing previous user data');
          clearUserData(previousUserId);
        }

        previousUserIdRef.current = newUserId;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    // Explicit cleanup on manual logout
    clearUserData(userId);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
