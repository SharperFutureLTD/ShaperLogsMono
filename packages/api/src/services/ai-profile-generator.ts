// @ts-nocheck - New tables not yet in Database types (added via migrations)
import { AIProviderFactory } from '../ai/factory';
import { supabase } from '../db/client';
import { analyzeUserVoice, VoiceProfile } from '../ai/prompts/voice-analyzer';

export interface ExtendedVoiceProfile extends VoiceProfile {
  preferredVocabulary: string[];
  verbosity: 'concise' | 'detailed' | 'varies';
}

export interface GenerationPreferences {
  preferredContentLength: 'short' | 'medium' | 'long';
  formalityLevel: number; // 1-5
  includeMetrics: boolean;
}

export interface AIUserProfile {
  id?: string;
  userId: string;
  firstName: string | null;
  profileName: string | null;
  writingStyle: ExtendedVoiceProfile;
  industry: string | null;
  employmentStatus: string | null;
  // Note: currentRole and currentCompany come from career_history table, not stored here
  careerSummary: string | null;
  careerGoals: string[];
  regularActivities: string[];
  aggregatedSkills: Record<string, number>;
  skillCategories: Record<string, string[]>;
  preferences: GenerationPreferences;
  lastGeneratedAt: string | null;
  entriesAnalyzedCount: number;
  version: number;
}

interface WorkEntry {
  id: string;
  redacted_summary: string;
  skills: string[] | null;
  achievements: string[] | null;
  metrics: Record<string, unknown> | null;
  category: string | null;
  created_at: string;
}

interface CareerHistoryEntry {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skills: string[] | null;
}

interface Target {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
}

interface UserProfile {
  display_name: string | null;
  industry: string | null;
  employment_status: string | null;
  study_field: string | null;
}

export class AIProfileGeneratorService {
  /**
   * Generate a comprehensive AI profile for a user
   * This profile is used to personalize AI-generated content
   */
  async generateProfile(userId: string): Promise<AIUserProfile> {
    // 1. Fetch user's profile (for safe info)
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, industry, employment_status, study_field')
      .eq('user_id', userId)
      .single();

    // 2. Fetch career history
    const { data: careerHistory } = await supabase
      .from('career_history')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    // 3. Fetch ALL work entries (for comprehensive analysis)
    const { data: workEntries } = await supabase
      .from('work_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 4. Fetch targets for goal inference
    const { data: targets } = await supabase
      .from('targets')
      .select('id, name, description, type, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    // 5. Extract safe user info (NO PII)
    const displayName = profile?.display_name || '';
    const firstName = this.extractFirstName(displayName);

    // 6. Extended voice analysis
    const basicVoiceProfile = analyzeUserVoice(
      (workEntries || []).map((e) => ({
        summary: e.redacted_summary,
        skills: e.skills || [],
        achievements: e.achievements || [],
      }))
    );

    const extendedVoice = this.analyzeVoiceExtended(workEntries || [], basicVoiceProfile);

    // 7. Aggregate skills with frequency
    const aggregatedSkills = this.aggregateSkills(workEntries || []);

    // 8. Categorize skills via AI (only if we have skills)
    let skillCategories: Record<string, string[]> = {};
    const skillNames = Object.keys(aggregatedSkills);
    if (skillNames.length > 0) {
      skillCategories = await this.categorizeSkills(skillNames);
    }

    // 9. Extract career goals from targets and entries
    const careerGoals = await this.extractCareerGoals(
      targets || [],
      workEntries || []
    );

    // 10. Identify regular activities
    const regularActivities = this.identifyRegularActivities(workEntries || []);

    // 11. Generate career summary
    const careerSummary = await this.generateCareerSummary(
      careerHistory || [],
      profile
    );

    // 12. Infer preferences from content patterns
    const preferences = this.inferPreferences(workEntries || []);

    const aiProfile: AIUserProfile = {
      userId,
      firstName,
      profileName: displayName || null,
      writingStyle: extendedVoice,
      industry: profile?.industry || null,
      employmentStatus: profile?.employment_status || null,
      // currentRole and currentCompany are fetched from career_history when needed, not stored
      careerSummary,
      careerGoals,
      regularActivities,
      aggregatedSkills,
      skillCategories,
      preferences,
      lastGeneratedAt: new Date().toISOString(),
      entriesAnalyzedCount: workEntries?.length || 0,
      version: 1,
    };

    // 14. Save to database
    const { data: savedProfile, error } = await supabase
      .from('ai_user_profiles')
      .upsert(
        {
          user_id: userId,
          first_name: aiProfile.firstName,
          profile_name: aiProfile.profileName,
          writing_style: aiProfile.writingStyle,
          industry: aiProfile.industry,
          employment_status: aiProfile.employmentStatus,
          // current_role and current_company come from career_history, not stored here
          career_summary: aiProfile.careerSummary,
          career_goals: aiProfile.careerGoals,
          regular_activities: aiProfile.regularActivities,
          aggregated_skills: aiProfile.aggregatedSkills,
          skill_categories: aiProfile.skillCategories,
          preferences: aiProfile.preferences,
          last_generated_at: aiProfile.lastGeneratedAt,
          entries_analyzed_count: aiProfile.entriesAnalyzedCount,
          version: aiProfile.version,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving AI profile:', error);
      throw error;
    }

    return {
      ...aiProfile,
      id: savedProfile?.id,
    };
  }

  /**
   * Get existing AI profile for a user
   */
  async getProfile(userId: string): Promise<AIUserProfile | null> {
    const { data, error } = await supabase
      .from('ai_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return this.mapDatabaseToProfile(data);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<GenerationPreferences>
  ): Promise<void> {
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new Error('AI profile not found');
    }

    const mergedPreferences = {
      ...existing.preferences,
      ...preferences,
    };

    const { error } = await supabase
      .from('ai_user_profiles')
      .update({ preferences: mergedPreferences })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  /**
   * Extract first name only (safe info)
   */
  private extractFirstName(displayName: string): string | null {
    if (!displayName) return null;
    const firstName = displayName.trim().split(/\s+/)[0];
    return firstName || null;
  }

  /**
   * Extended voice analysis with vocabulary and verbosity
   */
  private analyzeVoiceExtended(
    entries: WorkEntry[],
    basicProfile: VoiceProfile
  ): ExtendedVoiceProfile {
    if (entries.length === 0) {
      return {
        ...basicProfile,
        preferredVocabulary: [],
        verbosity: 'varies',
      };
    }

    // Calculate verbosity from entry lengths
    const lengths = entries.map((e) => e.redacted_summary?.length || 0);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = avgLength > 0 ? stdDev / avgLength : 0;

    let verbosity: 'concise' | 'detailed' | 'varies';
    if (coeffOfVariation > 0.5) {
      verbosity = 'varies';
    } else if (avgLength < 200) {
      verbosity = 'concise';
    } else {
      verbosity = 'detailed';
    }

    // Extract common vocabulary
    const wordFreq = new Map<string, number>();
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'that',
      'this',
      'these',
      'those',
      'it',
      'its',
    ]);

    for (const entry of entries) {
      const words = (entry.redacted_summary || '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/);

      for (const word of words) {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }
    }

    const preferredVocabulary = [...wordFreq.entries()]
      .filter(([_, count]) => count >= 3) // Used at least 3 times
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    return {
      ...basicProfile,
      preferredVocabulary,
      verbosity,
    };
  }

  /**
   * Aggregate skills with frequency counts
   */
  private aggregateSkills(entries: WorkEntry[]): Record<string, number> {
    const skillsMap: Record<string, number> = {};

    for (const entry of entries) {
      for (const skill of entry.skills || []) {
        const normalizedSkill = skill.trim();
        if (normalizedSkill) {
          skillsMap[normalizedSkill] = (skillsMap[normalizedSkill] || 0) + 1;
        }
      }
    }

    // Sort by frequency and return top 50
    return Object.fromEntries(
      Object.entries(skillsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
    );
  }

  /**
   * Categorize skills using AI
   */
  private async categorizeSkills(
    skills: string[]
  ): Promise<Record<string, string[]>> {
    if (skills.length === 0) return {};

    try {
      const aiProvider = AIProviderFactory.getProvider();
      const response = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `Categorize these professional skills into logical groups. Return ONLY a JSON object where keys are category names (lowercase, snake_case) and values are arrays of skills.

Skills to categorize:
${skills.slice(0, 50).join(', ')}

Example format:
{"technical": ["Python", "JavaScript"], "soft_skills": ["Communication", "Leadership"], "tools": ["Git", "Docker"]}`,
          },
        ],
        temperature: 0.2,
        maxTokens: 1000,
      });

      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error categorizing skills:', e);
    }

    // Fallback: return uncategorized
    return { uncategorized: skills.slice(0, 20) };
  }

  /**
   * Extract career goals from targets and work patterns
   */
  private async extractCareerGoals(
    targets: Target[],
    entries: WorkEntry[]
  ): Promise<string[]> {
    // If no targets, try to infer from entries
    if (targets.length === 0 && entries.length === 0) {
      return [];
    }

    try {
      const aiProvider = AIProviderFactory.getProvider();

      const targetDescriptions = targets
        .slice(0, 10)
        .map((t) => `${t.name}: ${t.description || ''}`)
        .join('\n');

      const recentEntries = entries
        .slice(0, 10)
        .map((e) => e.redacted_summary)
        .join('\n');

      const response = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `Based on these work targets and recent work entries, infer 3-5 career goals. Be specific but avoid any personal identifiable information.

TARGETS:
${targetDescriptions || 'No explicit targets set'}

RECENT WORK:
${recentEntries || 'No recent work entries'}

Return ONLY a JSON array of goal strings. Example: ["Develop expertise in cloud architecture", "Lead cross-functional projects"]`,
          },
        ],
        temperature: 0.3,
        maxTokens: 500,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error extracting career goals:', e);
    }

    return [];
  }

  /**
   * Identify regular work activities from category patterns
   */
  private identifyRegularActivities(entries: WorkEntry[]): string[] {
    const categoryFreq = new Map<string, number>();

    for (const entry of entries) {
      const cat = entry.category || 'general';
      categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + 1);
    }

    // Get top categories that represent significant portion of work
    const totalEntries = entries.length;
    const significantCategories = [...categoryFreq.entries()]
      .filter(([_, count]) => count / totalEntries >= 0.1) // At least 10% of entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return significantCategories.map(([cat, count]) => {
      const percentage = Math.round((count / totalEntries) * 100);
      return `${this.formatCategoryName(cat)} (${percentage}% of work)`;
    });
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Generate AI career summary (no PII)
   */
  private async generateCareerSummary(
    careerHistory: CareerHistoryEntry[],
    profile: UserProfile | null
  ): Promise<string | null> {
    if (!careerHistory || careerHistory.length === 0) {
      return null;
    }

    try {
      const aiProvider = AIProviderFactory.getProvider();

      const historyText = careerHistory
        .slice(0, 5)
        .map((c) => {
          const dates = c.is_current
            ? `${c.start_date} - Present`
            : `${c.start_date} - ${c.end_date}`;
          return `${c.title} (${dates})`;
        })
        .join('\n');

      const response = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `Write a brief 2-sentence career arc summary based on this career history. Do NOT include any company names, specific dates, or personal details. Focus only on career progression and expertise areas.

Career History:
${historyText}

${profile?.industry ? `Industry: ${profile.industry}` : ''}

Return only the 2-sentence summary, nothing else.`,
          },
        ],
        temperature: 0.3,
        maxTokens: 200,
      });

      return response.content.trim();
    } catch (e) {
      console.error('Error generating career summary:', e);
      return null;
    }
  }

  /**
   * Infer content generation preferences from patterns
   */
  private inferPreferences(entries: WorkEntry[]): GenerationPreferences {
    if (entries.length === 0) {
      return {
        preferredContentLength: 'medium',
        formalityLevel: 3,
        includeMetrics: false,
      };
    }

    const avgLength =
      entries.reduce((sum, e) => sum + (e.redacted_summary?.length || 0), 0) /
      entries.length;

    // Check if user includes metrics in their entries
    const entriesWithMetrics = entries.filter(
      (e) => e.metrics && Object.keys(e.metrics).length > 0
    ).length;
    const includeMetrics = entriesWithMetrics / entries.length > 0.3; // 30%+ have metrics

    // Determine content length preference
    let preferredContentLength: 'short' | 'medium' | 'long';
    if (avgLength < 150) {
      preferredContentLength = 'short';
    } else if (avgLength < 400) {
      preferredContentLength = 'medium';
    } else {
      preferredContentLength = 'long';
    }

    // Formality level - could be enhanced with more sophisticated analysis
    const formalityLevel = 3; // Default to middle

    return {
      preferredContentLength,
      formalityLevel,
      includeMetrics,
    };
  }

  /**
   * Map database record to AIUserProfile interface
   */
  private mapDatabaseToProfile(data: Record<string, unknown>): AIUserProfile {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      firstName: data.first_name as string | null,
      profileName: data.profile_name as string | null,
      writingStyle: data.writing_style as ExtendedVoiceProfile,
      industry: data.industry as string | null,
      employmentStatus: data.employment_status as string | null,
      // currentRole and currentCompany come from career_history table
      careerSummary: data.career_summary as string | null,
      careerGoals: (data.career_goals as string[]) || [],
      regularActivities: (data.regular_activities as string[]) || [],
      aggregatedSkills: (data.aggregated_skills as Record<string, number>) || {},
      skillCategories: (data.skill_categories as Record<string, string[]>) || {},
      preferences: data.preferences as GenerationPreferences,
      lastGeneratedAt: data.last_generated_at as string | null,
      entriesAnalyzedCount: (data.entries_analyzed_count as number) || 0,
      version: (data.version as number) || 1,
    };
  }
}

// Export singleton instance
export const aiProfileGenerator = new AIProfileGeneratorService();
