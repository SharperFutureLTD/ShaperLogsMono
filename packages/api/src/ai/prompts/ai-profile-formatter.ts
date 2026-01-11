import type { AIUserProfile } from '../../services/ai-profile-generator';

interface FormatOptions {
  // Current role/company from career_history (not stored in ai_user_profiles)
  currentRole?: string | null;
  currentCompany?: string | null;
}

/**
 * Format AI User Profile for inclusion in AI prompts
 * This provides personalized context to match the user's writing style
 * @param profile - The AI user profile
 * @param options - Additional context like current role from career_history
 */
export function formatAIProfileForPrompt(
  profile: AIUserProfile | null,
  options: FormatOptions = {}
): string {
  if (!profile) {
    return `
USER CONTEXT:
No user profile available. Use a professional, balanced tone.
    `.trim();
  }

  const sections: string[] = [];

  // User identity (safe info only)
  const identityParts: string[] = [];
  if (profile.firstName) {
    identityParts.push(`Name: ${profile.firstName}`);
  }
  // Current role comes from career_history via options
  if (options.currentRole) {
    identityParts.push(`Current Role: ${options.currentRole}`);
  }
  if (profile.industry) {
    identityParts.push(`Industry: ${profile.industry}`);
  }
  if (profile.careerSummary) {
    identityParts.push(`Career Background: ${profile.careerSummary}`);
  }

  if (identityParts.length > 0) {
    sections.push(identityParts.join('\n'));
  }

  // Writing style
  if (profile.writingStyle) {
    const styleLines: string[] = ['Writing Style Preferences:'];
    styleLines.push(`- Tone: ${profile.writingStyle.tone || 'balanced'}`);
    styleLines.push(`- Verbosity: ${profile.writingStyle.verbosity || 'varies'}`);
    styleLines.push(`- Sentence Length: ${profile.writingStyle.sentenceLength || 'medium'}`);

    if (profile.writingStyle.patterns && profile.writingStyle.patterns.length > 0) {
      styleLines.push(`- Patterns: ${profile.writingStyle.patterns.join('; ')}`);
    }

    if (
      profile.writingStyle.preferredVocabulary &&
      profile.writingStyle.preferredVocabulary.length > 0
    ) {
      styleLines.push(
        `- Common vocabulary: ${profile.writingStyle.preferredVocabulary.slice(0, 10).join(', ')}`
      );
    }

    sections.push(styleLines.join('\n'));
  }

  // Top skills
  if (profile.aggregatedSkills && Object.keys(profile.aggregatedSkills).length > 0) {
    const topSkills = Object.entries(profile.aggregatedSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    sections.push(`Top Skills: ${topSkills.join(', ')}`);
  }

  // Career goals
  if (profile.careerGoals && profile.careerGoals.length > 0) {
    sections.push(`Career Goals: ${profile.careerGoals.join('; ')}`);
  }

  // Regular activities
  if (profile.regularActivities && profile.regularActivities.length > 0) {
    sections.push(`Regular Work Activities: ${profile.regularActivities.join('; ')}`);
  }

  // Content preferences
  if (profile.preferences) {
    const prefLines: string[] = ['Content Preferences:'];
    prefLines.push(`- Length: ${profile.preferences.preferredContentLength || 'medium'}`);
    if (profile.preferences.includeMetrics) {
      prefLines.push('- Include quantitative metrics when available');
    }
    sections.push(prefLines.join('\n'));
  }

  return `
USER CONTEXT (Use this to personalize the output):

${sections.join('\n\n')}

IMPORTANT: Match this user's writing style. Write how THEY would write, not in a generic corporate tone.
  `.trim();
}

/**
 * Get a concise version of the profile for token-limited contexts
 * @param profile - The AI user profile
 * @param options - Additional context like current role from career_history
 */
export function formatAIProfileConcise(
  profile: AIUserProfile | null,
  options: FormatOptions = {}
): string {
  if (!profile) {
    return 'No user profile available.';
  }

  const parts: string[] = [];

  // Current role comes from career_history via options
  if (options.currentRole && profile.industry) {
    parts.push(`Role: ${options.currentRole} (${profile.industry})`);
  } else if (options.currentRole) {
    parts.push(`Role: ${options.currentRole}`);
  } else if (profile.industry) {
    parts.push(`Industry: ${profile.industry}`);
  }

  if (profile.writingStyle) {
    parts.push(`Style: ${profile.writingStyle.tone}, ${profile.writingStyle.verbosity}`);
  }

  if (profile.aggregatedSkills) {
    const topSkills = Object.keys(profile.aggregatedSkills).slice(0, 5);
    if (topSkills.length > 0) {
      parts.push(`Skills: ${topSkills.join(', ')}`);
    }
  }

  return parts.join(' | ');
}
