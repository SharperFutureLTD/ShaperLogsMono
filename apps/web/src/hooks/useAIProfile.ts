import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface WritingStyle {
  sentenceLength: 'short' | 'medium' | 'long';
  tone: 'casual' | 'professional' | 'technical' | 'balanced';
  patterns: string[];
  examples: string[];
  avgWordCount: number;
  preferredVocabulary: string[];
  verbosity: 'concise' | 'detailed' | 'varies';
}

export interface AIProfilePreferences {
  preferredContentLength: 'short' | 'medium' | 'long';
  formalityLevel: number;
  includeMetrics: boolean;
}

export interface AIUserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  profile_name: string | null;
  writing_style: WritingStyle;
  industry: string | null;
  employment_status: string | null;
  current_role: string | null;
  current_company: string | null;
  career_summary: string | null;
  career_goals: string[];
  regular_activities: string[];
  aggregated_skills: Record<string, number>;
  skill_categories: Record<string, string[]>;
  preferences: AIProfilePreferences;
  last_generated_at: string | null;
  entries_analyzed_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing the AI User Profile
 *
 * The AI profile is a "Claude.md" style profile that captures:
 * - How the user talks/writes (tone, verbosity, vocabulary)
 * - Career context (role, industry, goals)
 * - Aggregated skills from all work entries
 *
 * This is used to personalize AI-generated content to sound like the user.
 */
export function useAIProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to fetch the AI profile
  const profileQuery = useQuery({
    queryKey: ['ai-profile'],
    queryFn: () => apiClient.getAIProfile(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - profile doesn't change often
  });

  // Mutation to generate/regenerate the profile
  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateAIProfile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-profile'] });
    },
  });

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<AIProfilePreferences>) =>
      apiClient.updateAIProfilePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-profile'] });
    },
  });

  const profile = profileQuery.data?.data || null;
  const exists = profileQuery.data?.exists || false;

  return {
    // Data
    profile,
    exists,

    // Derived data
    writingStyle: profile?.writing_style || null,
    topSkills: profile?.aggregated_skills
      ? Object.entries(profile.aggregated_skills)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([skill]) => skill)
      : [],
    careerGoals: profile?.career_goals || [],

    // Loading states
    isLoading: profileQuery.isLoading,
    isGenerating: generateMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,

    // Error states
    error: profileQuery.error,
    generateError: generateMutation.error,

    // Actions
    generateProfile: generateMutation.mutateAsync,
    updatePreferences: updatePreferencesMutation.mutateAsync,

    // Refetch
    refetch: profileQuery.refetch,
  };
}

/**
 * Hook to check if AI profile needs regeneration
 * (e.g., if there are new entries since last generation)
 */
export function useAIProfileStatus() {
  const { profile, exists, isLoading } = useAIProfile();

  // Profile is stale if:
  // 1. It doesn't exist
  // 2. It was generated more than 7 days ago
  // 3. There could be new entries (we don't track this here, but the background job does)

  const isStale = !exists || (
    profile?.last_generated_at &&
    new Date(profile.last_generated_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const needsGeneration = !exists;
  const needsRegeneration = exists && isStale;

  return {
    exists,
    isStale,
    needsGeneration,
    needsRegeneration,
    lastGeneratedAt: profile?.last_generated_at,
    entriesAnalyzed: profile?.entries_analyzed_count || 0,
    isLoading,
  };
}
