import { DefaultOptions, QueryClient } from '@tanstack/react-query';

/**
 * React Query Configuration
 *
 * Centralized configuration for all queries and mutations.
 */
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - cache data for 5 minutes (formerly cacheTime)
    retry: 3, // Retry failed requests 3 times
    refetchOnWindowFocus: true, // Refetch when window regains focus
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
