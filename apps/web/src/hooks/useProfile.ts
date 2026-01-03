'use client'

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './useAuth';
import type { EmploymentStatus } from '@/components/StatusSelector';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  industry: string | null;
  employment_status: EmploymentStatus | null;
  study_field: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch profile via REST API
  const {
    data: profile,
    isLoading: loading,
    error: queryError,
    refetch: reactQueryRefetch
  } = useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: () => apiClient.getProfile(),
    enabled: !!user,
  });

  // UPDATE INDUSTRY MUTATION
  const updateIndustryMutation = useMutation({
    mutationFn: (industry: string) => apiClient.updateIndustry(industry),

    onMutate: async (industry) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previousData = queryClient.getQueryData(queryKeys.profile.detail());

      queryClient.setQueryData(queryKeys.profile.detail(), (old: Profile | undefined) => {
        return old ? { ...old, industry } : old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating industry:', err);
      queryClient.setQueryData(queryKeys.profile.detail(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });

  // UPDATE EMPLOYMENT STATUS MUTATION
  const updateEmploymentStatusMutation = useMutation({
    mutationFn: (employmentStatus: EmploymentStatus) =>
      apiClient.updateEmploymentStatus(employmentStatus),

    onMutate: async (employmentStatus) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previousData = queryClient.getQueryData(queryKeys.profile.detail());

      queryClient.setQueryData(queryKeys.profile.detail(), (old: Profile | undefined) => {
        return old ? { ...old, employment_status: employmentStatus } : old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating employment status:', err);
      queryClient.setQueryData(queryKeys.profile.detail(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });

  // UPDATE STUDY FIELD MUTATION
  const updateStudyFieldMutation = useMutation({
    mutationFn: (studyField: string) => apiClient.updateStudyField(studyField),

    onMutate: async (studyField) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previousData = queryClient.getQueryData(queryKeys.profile.detail());

      queryClient.setQueryData(queryKeys.profile.detail(), (old: Profile | undefined) => {
        return old ? { ...old, study_field: studyField } : old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating study field:', err);
      queryClient.setQueryData(queryKeys.profile.detail(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });

  // UPDATE PROFILE MUTATION (bulk update)
  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      employmentStatus?: EmploymentStatus;
      industry?: string | null;
      studyField?: string | null;
    }) => apiClient.updateProfile({
      employmentStatus: data.employmentStatus,
      industry: data.industry ?? undefined,
      studyField: data.studyField ?? undefined,
    }),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previousData = queryClient.getQueryData(queryKeys.profile.detail());

      queryClient.setQueryData(queryKeys.profile.detail(), (old: Profile | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ...(data.employmentStatus !== undefined && { employment_status: data.employmentStatus }),
          ...(data.industry !== undefined && { industry: data.industry }),
          ...(data.studyField !== undefined && { study_field: data.studyField }),
        };
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error updating profile:', err);
      queryClient.setQueryData(queryKeys.profile.detail(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });

  // COMPLETE ONBOARDING MUTATION
  const completeOnboardingMutation = useMutation({
    mutationFn: (data: {
      employmentStatus: EmploymentStatus;
      industry: string;
      studyField?: string;
    }) => apiClient.completeOnboarding(data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previousData = queryClient.getQueryData(queryKeys.profile.detail());

      queryClient.setQueryData(queryKeys.profile.detail(), (old: Profile | undefined) => {
        if (!old) return old;
        return {
          ...old,
          employment_status: data.employmentStatus,
          industry: data.industry,
          study_field: data.studyField || null,
        };
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      console.error('Error completing onboarding:', err);
      queryClient.setQueryData(queryKeys.profile.detail(), context?.previousData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });

  // Backward-compatible wrappers
  const updateIndustry = useCallback(async (industry: string): Promise<boolean> => {
    try {
      await updateIndustryMutation.mutateAsync(industry);
      return true;
    } catch (err) {
      console.error('Error in updateIndustry:', err);
      return false;
    }
  }, [updateIndustryMutation]);

  const updateEmploymentStatus = useCallback(async (employmentStatus: EmploymentStatus): Promise<boolean> => {
    try {
      await updateEmploymentStatusMutation.mutateAsync(employmentStatus);
      return true;
    } catch (err) {
      console.error('Error in updateEmploymentStatus:', err);
      return false;
    }
  }, [updateEmploymentStatusMutation]);

  const updateStudyField = useCallback(async (studyField: string): Promise<boolean> => {
    try {
      await updateStudyFieldMutation.mutateAsync(studyField);
      return true;
    } catch (err) {
      console.error('Error in updateStudyField:', err);
      return false;
    }
  }, [updateStudyFieldMutation]);

  const updateProfile = useCallback(async (data: {
    employmentStatus?: EmploymentStatus;
    industry?: string | null;
    studyField?: string | null;
  }): Promise<boolean> => {
    try {
      await updateProfileMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('Error in updateProfile:', err);
      return false;
    }
  }, [updateProfileMutation]);

  const completeOnboarding = useCallback(async (data: {
    employmentStatus: EmploymentStatus;
    industry: string;
    studyField?: string;
  }): Promise<boolean> => {
    try {
      await completeOnboardingMutation.mutateAsync(data);
      return true;
    } catch (err) {
      console.error('Error in completeOnboarding:', err);
      return false;
    }
  }, [completeOnboardingMutation]);

  const refetch = useCallback(async () => {
    await reactQueryRefetch();
  }, [reactQueryRefetch]);

  // Onboarding is needed if the user has no employment_status set
  const needsOnboarding = !loading && profile && !profile.employment_status;

  // Return exact same interface
  return {
    profile: profile || null,
    loading,
    error: queryError?.message || null,
    updateIndustry,
    updateEmploymentStatus,
    updateStudyField,
    updateProfile,
    completeOnboarding,
    needsOnboarding,
    refetch,
  };
};
