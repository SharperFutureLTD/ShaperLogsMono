import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

export function useSubscription() {
  const queryClient = useQueryClient();

  // Query subscription status
  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.getSubscriptionStatus(),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiClient.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Subscription will be cancelled at the end of your billing period');
    },
    onError: (error) => {
      toast.error('Failed to cancel subscription');
      console.error('Cancel error:', error);
    },
  });

  return {
    subscription,
    isLoading,
    error,
    hasSubscription: subscription?.hasSubscription ?? false,
    isActive: subscription?.status === 'active',
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    cancelSubscription: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}

export function useBillingHistory() {
  return useQuery({
    queryKey: ['billing-history'],
    queryFn: () => apiClient.getBillingHistory(),
    staleTime: 60000, // Cache for 1 minute
  });
}
