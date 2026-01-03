import { DefaultOptions, QueryClient } from '@tanstack/react-query';

/**
 * React Query Configuration
 *
 * Centralized configuration for all queries and mutations.
 */
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 60 * 1000, // 60 seconds - reduce API calls for better efficiency
    gcTime: 10 * 60 * 1000, // 10 minutes - keep cache longer
    retry: 2, // Reduce retries to fail faster on persistent errors
    refetchOnWindowFocus: false, // Disable aggressive window focus refetching
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnReconnect: true, // Refetch when reconnecting to internet
  },
  mutations: {
    retry: 1, // Retry mutations only once
  },
};

/**
 * Global QueryClient instance
 *
 * Use this in your app providers and for manual query operations.
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});
