import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * usePersistedState - Persist state to sessionStorage with optional user scoping
 *
 * SECURITY: Pass userId to scope storage keys per user, preventing data leakage
 * between different user accounts on the same browser.
 *
 * @param key - Base storage key
 * @param initialValue - Default value if no stored value exists
 * @param userId - Optional user ID to scope the storage key (recommended for user-specific data)
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  userId?: string | null
): [T, Dispatch<SetStateAction<T>>] {
  // Scope key with user ID if provided
  const scopedKey = userId ? `${key}-${userId}` : key;

  // Get initial value from sessionStorage or use default
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.sessionStorage.getItem(scopedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading persisted state for key "${scopedKey}":`, error);
      return initialValue;
    }
  });

  // Update sessionStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.setItem(scopedKey, JSON.stringify(state));
    } catch (error) {
      console.error(`Error persisting state for key "${scopedKey}":`, error);
    }
  }, [scopedKey, state]);

  return [state, setState];
}
