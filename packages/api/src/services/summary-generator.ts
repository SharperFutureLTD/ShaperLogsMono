// @ts-nocheck - New tables not yet in Database types (added via migrations)
import { format } from 'date-fns';
import { AIProviderFactory } from '../ai/factory';
import { supabase } from '../db/client';

export interface SummaryGenerationConfig {
  userId: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
}

export interface WorkEntry {
  id: string;
  redacted_summary: string;
  skills: string[] | null;
  achievements: string[] | null;
  metrics: Record<string, unknown> | null;
  category: string | null;
  created_at: string;
}

export interface PeriodicSummary {
  id: string;
  user_id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  summary_text: string;
  top_skills: string[];
  top_achievements: string[];
  key_metrics: Record<string, unknown>;
  categories_breakdown: Record<string, number>;
  work_entry_count: number;
  source_entry_ids: string[];
  source_summary_ids: string[];
  token_count: number;
}

export class SummaryGeneratorService {
  /**
   * Generate monthly summary from work entries
   */
  async generateMonthlySummary(config: SummaryGenerationConfig): Promise<PeriodicSummary | null> {
    const { userId, periodStart, periodEnd } = config;

    // Fetch work entries for the period
    const { data: entries, error } = await supabase
      .from('work_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching work entries:', error);
      throw error;
    }

    if (!entries || entries.length === 0) {
      return null; // No entries for this period
    }

    // Aggregate skills with frequency
    const skillsMap = new Map<string, number>();
    const allAchievements: string[] = [];
    const categoryCounts: Record<string, number> = {};
    const allMetrics: Record<string, unknown>[] = [];

    for (const entry of entries) {
      // Aggregate skills
      for (const skill of entry.skills || []) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
      // Collect achievements
      allAchievements.push(...(entry.achievements || []));
      // Count categories
      const cat = entry.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      // Collect metrics
      if (entry.metrics) {
        allMetrics.push(entry.metrics);
      }
    }

    // Get top skills (sorted by frequency)
    const topSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    // AI-generate summary text
    const aiProvider = AIProviderFactory.getProvider();
    const summaryPrompt = this.buildMonthlySummaryPrompt(entries, topSkills, categoryCounts);

    const summaryResponse = await aiProvider.complete({
      messages: [{ role: 'user', content: summaryPrompt }],
      systemPrompt:
        'You are a professional summary writer. Create a concise monthly work summary that highlights key accomplishments, skills applied, and overall progress. Write in first person.',
      temperature: 0.3,
      maxTokens: 1000,
    });

    // Extract top achievements via AI
    let topAchievements: string[] = [];
    if (allAchievements.length > 0) {
      const achievementsResponse = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `From these achievements, select the top 5 most impactful and meaningful ones. Return ONLY a JSON array of strings, no other text:\n\n${allAchievements.join('\n')}`,
          },
        ],
        temperature: 0.2,
        maxTokens: 500,
      });

      try {
        // Extract JSON array from response
        const jsonMatch = achievementsResponse.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          topAchievements = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Fallback: take first 5 achievements if parsing fails
        topAchievements = allAchievements.slice(0, 5);
      }
    }

    // Aggregate metrics
    const keyMetrics = this.aggregateMetrics(allMetrics);

    // Save to database
    const summaryData = {
      user_id: userId,
      period_type: 'monthly' as const,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary_text: summaryResponse.content,
      top_skills: topSkills,
      top_achievements: topAchievements,
      key_metrics: keyMetrics,
      categories_breakdown: categoryCounts,
      work_entry_count: entries.length,
      source_entry_ids: entries.map((e) => e.id),
      source_summary_ids: [],
      token_count: summaryResponse.usage?.totalTokens || 0,
    };

    const { data: savedSummary, error: saveError } = await supabase
      .from('periodic_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,period_type,period_start',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      throw saveError;
    }

    return savedSummary as PeriodicSummary;
  }

  /**
   * Generate quarterly summary from monthly summaries (rollup)
   */
  async generateQuarterlySummary(config: SummaryGenerationConfig): Promise<PeriodicSummary | null> {
    const { userId, periodStart, periodEnd } = config;

    // Fetch monthly summaries for this quarter
    const { data: monthlySummaries, error } = await supabase
      .from('periodic_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'monthly')
      .gte('period_start', format(periodStart, 'yyyy-MM-dd'))
      .lte('period_end', format(periodEnd, 'yyyy-MM-dd'));

    if (error) {
      console.error('Error fetching monthly summaries:', error);
      throw error;
    }

    // If no monthly summaries, generate from entries directly
    if (!monthlySummaries || monthlySummaries.length === 0) {
      return this.generateFromEntries(config);
    }

    // Merge skills across months
    const skillsMap = new Map<string, number>();
    const allAchievements: string[] = [];
    const categoryCounts: Record<string, number> = {};
    let totalEntryCount = 0;

    for (const summary of monthlySummaries) {
      // Aggregate skills
      for (const skill of summary.top_skills || []) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
      // Collect achievements
      allAchievements.push(...(summary.top_achievements || []));
      // Merge category counts
      for (const [cat, count] of Object.entries(
        (summary.categories_breakdown as Record<string, number>) || {}
      )) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
      }
      totalEntryCount += summary.work_entry_count || 0;
    }

    // AI-generate quarterly summary from monthly summaries
    const aiProvider = AIProviderFactory.getProvider();
    const summaryTexts = monthlySummaries.map((s) => s.summary_text).join('\n\n---\n\n');

    const response = await aiProvider.complete({
      messages: [
        {
          role: 'user',
          content: `Synthesize these monthly summaries into a cohesive quarterly overview:\n\n${summaryTexts}\n\nHighlight major themes, key accomplishments, and skill growth across the quarter. Write 2-3 paragraphs in first person.`,
        },
      ],
      systemPrompt:
        'You are a professional summary writer. Create a cohesive quarterly work summary that shows progression and impact.',
      temperature: 0.3,
      maxTokens: 1500,
    });

    // Select top achievements from quarter
    let topAchievements: string[] = [];
    if (allAchievements.length > 0) {
      const achievementsResponse = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `From these quarterly achievements, select the top 5 most impactful. Return ONLY a JSON array of strings:\n\n${allAchievements.join('\n')}`,
          },
        ],
        temperature: 0.2,
        maxTokens: 500,
      });

      try {
        const jsonMatch = achievementsResponse.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          topAchievements = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        topAchievements = allAchievements.slice(0, 5);
      }
    }

    // Get top skills
    const topSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill]) => skill);

    // Save quarterly summary
    const summaryData = {
      user_id: userId,
      period_type: 'quarterly' as const,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary_text: response.content,
      top_skills: topSkills,
      top_achievements: topAchievements,
      key_metrics: {},
      categories_breakdown: categoryCounts,
      work_entry_count: totalEntryCount,
      source_entry_ids: [],
      source_summary_ids: monthlySummaries.map((s) => s.id),
      token_count: response.usage?.totalTokens || 0,
    };

    const { data: savedSummary, error: saveError } = await supabase
      .from('periodic_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,period_type,period_start',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving quarterly summary:', saveError);
      throw saveError;
    }

    return savedSummary as PeriodicSummary;
  }

  /**
   * Generate yearly summary from quarterly summaries (rollup)
   */
  async generateYearlySummary(config: SummaryGenerationConfig): Promise<PeriodicSummary | null> {
    const { userId, periodStart, periodEnd } = config;

    // Fetch quarterly summaries for this year
    const { data: quarterlySummaries, error } = await supabase
      .from('periodic_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'quarterly')
      .gte('period_start', format(periodStart, 'yyyy-MM-dd'))
      .lte('period_end', format(periodEnd, 'yyyy-MM-dd'));

    if (error) {
      console.error('Error fetching quarterly summaries:', error);
      throw error;
    }

    // If no quarterly summaries, try monthly, then entries
    if (!quarterlySummaries || quarterlySummaries.length === 0) {
      // Try monthly summaries instead
      const { data: monthlySummaries } = await supabase
        .from('periodic_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', 'monthly')
        .gte('period_start', format(periodStart, 'yyyy-MM-dd'))
        .lte('period_end', format(periodEnd, 'yyyy-MM-dd'));

      if (!monthlySummaries || monthlySummaries.length === 0) {
        return this.generateFromEntries(config);
      }

      // Generate from monthly summaries
      return this.generateYearlyFromMonthlies(userId, periodStart, periodEnd, monthlySummaries);
    }

    // Merge data from quarters
    const skillsMap = new Map<string, number>();
    const allAchievements: string[] = [];
    const categoryCounts: Record<string, number> = {};
    let totalEntryCount = 0;

    for (const summary of quarterlySummaries) {
      for (const skill of summary.top_skills || []) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
      allAchievements.push(...(summary.top_achievements || []));
      for (const [cat, count] of Object.entries(
        (summary.categories_breakdown as Record<string, number>) || {}
      )) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
      }
      totalEntryCount += summary.work_entry_count || 0;
    }

    // AI-generate yearly milestone summary
    const aiProvider = AIProviderFactory.getProvider();
    const summaryTexts = quarterlySummaries.map((s) => s.summary_text).join('\n\n---\n\n');

    const response = await aiProvider.complete({
      messages: [
        {
          role: 'user',
          content: `Create a yearly milestone summary from these quarterly reviews:\n\n${summaryTexts}\n\nFocus on:\n- Career progression and growth\n- Major accomplishments and impact\n- Skill development trajectory\n- Key themes and patterns\n\nWrite 3-4 paragraphs in first person.`,
        },
      ],
      systemPrompt:
        'You are a professional summary writer. Create an inspiring yearly career summary that captures growth, achievements, and professional development.',
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Select top 7 achievements for the year
    let topAchievements: string[] = [];
    if (allAchievements.length > 0) {
      const achievementsResponse = await aiProvider.complete({
        messages: [
          {
            role: 'user',
            content: `From these yearly achievements, select the top 7 most impactful career milestones. Return ONLY a JSON array of strings:\n\n${allAchievements.join('\n')}`,
          },
        ],
        temperature: 0.2,
        maxTokens: 500,
      });

      try {
        const jsonMatch = achievementsResponse.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          topAchievements = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        topAchievements = allAchievements.slice(0, 7);
      }
    }

    const topSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill]) => skill);

    const summaryData = {
      user_id: userId,
      period_type: 'yearly' as const,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary_text: response.content,
      top_skills: topSkills,
      top_achievements: topAchievements,
      key_metrics: {},
      categories_breakdown: categoryCounts,
      work_entry_count: totalEntryCount,
      source_entry_ids: [],
      source_summary_ids: quarterlySummaries.map((s) => s.id),
      token_count: response.usage?.totalTokens || 0,
    };

    const { data: savedSummary, error: saveError } = await supabase
      .from('periodic_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,period_type,period_start',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving yearly summary:', saveError);
      throw saveError;
    }

    return savedSummary as PeriodicSummary;
  }

  /**
   * Fallback: generate summary directly from entries when no prior summaries exist
   */
  private async generateFromEntries(
    config: SummaryGenerationConfig
  ): Promise<PeriodicSummary | null> {
    const { userId, periodType, periodStart, periodEnd } = config;

    const { data: entries, error } = await supabase
      .from('work_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: true });

    if (error || !entries || entries.length === 0) {
      return null;
    }

    // Similar aggregation as monthly but for the full period
    const skillsMap = new Map<string, number>();
    const allAchievements: string[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const entry of entries) {
      for (const skill of entry.skills || []) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
      allAchievements.push(...(entry.achievements || []));
      const cat = entry.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const topSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, periodType === 'yearly' ? 20 : periodType === 'quarterly' ? 15 : 10)
      .map(([skill]) => skill);

    const aiProvider = AIProviderFactory.getProvider();
    const prompt = this.buildSummaryPrompt(entries, topSkills, categoryCounts, periodType);

    const response = await aiProvider.complete({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: `You are a professional summary writer. Create a ${periodType} work summary.`,
      temperature: 0.3,
      maxTokens: periodType === 'yearly' ? 2000 : periodType === 'quarterly' ? 1500 : 1000,
    });

    const summaryData = {
      user_id: userId,
      period_type: periodType,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary_text: response.content,
      top_skills: topSkills,
      top_achievements: allAchievements.slice(0, 5),
      key_metrics: {},
      categories_breakdown: categoryCounts,
      work_entry_count: entries.length,
      source_entry_ids: entries.map((e) => e.id),
      source_summary_ids: [],
      token_count: response.usage?.totalTokens || 0,
    };

    const { data: savedSummary, error: saveError } = await supabase
      .from('periodic_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,period_type,period_start',
      })
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return savedSummary as PeriodicSummary;
  }

  private async generateYearlyFromMonthlies(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    monthlySummaries: PeriodicSummary[]
  ): Promise<PeriodicSummary | null> {
    const skillsMap = new Map<string, number>();
    const allAchievements: string[] = [];
    const categoryCounts: Record<string, number> = {};
    let totalEntryCount = 0;

    for (const summary of monthlySummaries) {
      for (const skill of summary.top_skills || []) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
      allAchievements.push(...(summary.top_achievements || []));
      for (const [cat, count] of Object.entries(
        (summary.categories_breakdown as Record<string, number>) || {}
      )) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
      }
      totalEntryCount += summary.work_entry_count || 0;
    }

    const aiProvider = AIProviderFactory.getProvider();
    const summaryTexts = monthlySummaries.map((s) => s.summary_text).join('\n\n---\n\n');

    const response = await aiProvider.complete({
      messages: [
        {
          role: 'user',
          content: `Create a yearly milestone summary from these monthly reviews:\n\n${summaryTexts}\n\nFocus on career progression, major accomplishments, and skill development. Write 3-4 paragraphs in first person.`,
        },
      ],
      systemPrompt: 'You are a professional summary writer creating a yearly career summary.',
      temperature: 0.3,
      maxTokens: 2000,
    });

    const topSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill]) => skill);

    const summaryData = {
      user_id: userId,
      period_type: 'yearly' as const,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary_text: response.content,
      top_skills: topSkills,
      top_achievements: allAchievements.slice(0, 7),
      key_metrics: {},
      categories_breakdown: categoryCounts,
      work_entry_count: totalEntryCount,
      source_entry_ids: [],
      source_summary_ids: monthlySummaries.map((s) => s.id),
      token_count: response.usage?.totalTokens || 0,
    };

    const { data: savedSummary, error: saveError } = await supabase
      .from('periodic_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,period_type,period_start',
      })
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return savedSummary as PeriodicSummary;
  }

  private buildMonthlySummaryPrompt(
    entries: WorkEntry[],
    topSkills: string[],
    categoryCounts: Record<string, number>
  ): string {
    const entrySummaries = entries
      .map((e, i) => `${i + 1}. ${e.redacted_summary}`)
      .join('\n');

    const categories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ');

    return `
Summarize this month's work in 2-3 paragraphs:

WORK ENTRIES (${entries.length} total):
${entrySummaries}

TOP SKILLS USED: ${topSkills.join(', ')}
WORK CATEGORIES: ${categories}

Focus on:
- Major accomplishments and impact
- Key themes and projects
- Skills applied and developed
- Challenges overcome

Write in first person, professional tone. Be concise but comprehensive.
    `.trim();
  }

  private buildSummaryPrompt(
    entries: WorkEntry[],
    topSkills: string[],
    categoryCounts: Record<string, number>,
    periodType: string
  ): string {
    const entrySummaries = entries
      .slice(0, 50) // Limit for token management
      .map((e, i) => `${i + 1}. ${e.redacted_summary}`)
      .join('\n');

    return `
Summarize this ${periodType} period's work:

WORK ENTRIES (${entries.length} total, showing first ${Math.min(entries.length, 50)}):
${entrySummaries}

TOP SKILLS: ${topSkills.join(', ')}

Create a ${periodType === 'yearly' ? '3-4' : '2-3'} paragraph summary focusing on accomplishments, themes, and professional growth. Write in first person.
    `.trim();
  }

  private aggregateMetrics(metrics: Record<string, unknown>[]): Record<string, unknown> {
    // Simple aggregation - sum numeric values, collect strings
    const result: Record<string, unknown> = {};

    for (const m of metrics) {
      for (const [key, value] of Object.entries(m)) {
        if (typeof value === 'number') {
          result[key] = ((result[key] as number) || 0) + value;
        }
      }
    }

    return result;
  }

  /**
   * Get summaries for a user by period type
   */
  async getSummaries(
    userId: string,
    periodType?: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<PeriodicSummary[]> {
    let query = supabase
      .from('periodic_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false });

    if (periodType) {
      query = query.eq('period_type', periodType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as PeriodicSummary[];
  }

  /**
   * Get a specific summary
   */
  async getSummary(
    userId: string,
    periodType: 'monthly' | 'quarterly' | 'yearly',
    periodStart: string
  ): Promise<PeriodicSummary | null> {
    const { data, error } = await supabase
      .from('periodic_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data as PeriodicSummary;
  }

  /**
   * Delete a summary
   */
  async deleteSummary(userId: string, summaryId: string): Promise<void> {
    const { error } = await supabase
      .from('periodic_summaries')
      .delete()
      .eq('id', summaryId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const summaryGenerator = new SummaryGeneratorService();
