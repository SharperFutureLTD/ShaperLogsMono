'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        setError(fetchError.message);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateIndustry = async (industry: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ industry })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating industry:', updateError);
        setError(updateError.message);
        return false;
      }

      setProfile(prev => prev ? { ...prev, industry } : null);
      return true;
    } catch (err) {
      console.error('Error in updateIndustry:', err);
      setError('Failed to update industry');
      return false;
    }
  };

  const updateEmploymentStatus = async (employmentStatus: EmploymentStatus): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ employment_status: employmentStatus })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating employment status:', updateError);
        setError(updateError.message);
        return false;
      }

      setProfile(prev => prev ? { ...prev, employment_status: employmentStatus } : null);
      return true;
    } catch (err) {
      console.error('Error in updateEmploymentStatus:', err);
      setError('Failed to update employment status');
      return false;
    }
  };

  const updateStudyField = async (studyField: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ study_field: studyField })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating study field:', updateError);
        setError(updateError.message);
        return false;
      }

      setProfile(prev => prev ? { ...prev, study_field: studyField } : null);
      return true;
    } catch (err) {
      console.error('Error in updateStudyField:', err);
      setError('Failed to update study field');
      return false;
    }
  };

  const updateProfile = async (data: {
    employmentStatus?: EmploymentStatus;
    industry?: string | null;
    studyField?: string | null;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: {
        employment_status?: EmploymentStatus;
        industry?: string | null;
        study_field?: string | null;
      } = {};

      if (data.employmentStatus !== undefined) {
        updateData.employment_status = data.employmentStatus;
      }
      if (data.industry !== undefined) {
        updateData.industry = data.industry;
      }
      if (data.studyField !== undefined) {
        updateData.study_field = data.studyField;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError(updateError.message);
        return false;
      }

      setProfile(prev => prev ? {
        ...prev,
        ...(data.employmentStatus !== undefined && { employment_status: data.employmentStatus }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.studyField !== undefined && { study_field: data.studyField }),
      } : null);
      return true;
    } catch (err) {
      console.error('Error in updateProfile:', err);
      setError('Failed to update profile');
      return false;
    }
  };

  const completeOnboarding = async (data: {
    employmentStatus: EmploymentStatus;
    industry: string;
    studyField?: string;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: {
        employment_status: EmploymentStatus;
        industry: string;
        study_field?: string;
      } = {
        employment_status: data.employmentStatus,
        industry: data.industry,
      };

      if (data.studyField) {
        updateData.study_field = data.studyField;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error completing onboarding:', updateError);
        setError(updateError.message);
        return false;
      }

      setProfile(prev => prev ? {
        ...prev,
        employment_status: data.employmentStatus,
        industry: data.industry,
        study_field: data.studyField || null,
      } : null);
      return true;
    } catch (err) {
      console.error('Error in completeOnboarding:', err);
      setError('Failed to complete onboarding');
      return false;
    }
  };

  // Onboarding is needed if the user has no employment_status set
  const needsOnboarding = !loading && profile && !profile.employment_status;

  return {
    profile,
    loading,
    error,
    updateIndustry,
    updateEmploymentStatus,
    updateStudyField,
    updateProfile,
    completeOnboarding,
    needsOnboarding,
    refetch: fetchProfile,
  };
};
