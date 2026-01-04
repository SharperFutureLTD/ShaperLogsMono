/**
 * Voice Analyzer - Extracts user's writing style from their work logs
 *
 * This analyzes the user's recent work entries to understand their natural writing voice
 * and provides examples to the AI to match their style.
 */

interface WorkEntry {
  summary: string;
  skills?: string[];
  achievements?: string[];
}

export interface VoiceProfile {
  sentenceLength: 'short' | 'medium' | 'long';
  tone: 'casual' | 'professional' | 'technical' | 'balanced';
  patterns: string[];
  examples: string[];
  avgWordCount: number;
}

/**
 * Calculate average sentence length from text samples
 */
function calculateAvgSentenceLength(samples: string[]): number {
  let totalWords = 0;
  let totalSentences = 0;

  for (const sample of samples) {
    const sentences = sample.split(/[.!?]+/).filter(s => s.trim().length > 0);
    totalSentences += sentences.length;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    }
  }

  return totalSentences > 0 ? totalWords / totalSentences : 15;
}

/**
 * Extract common phrases and patterns from samples
 */
function extractCommonPhrases(samples: string[]): string[] {
  const patterns: string[] = [];

  // Look for common starting words/phrases
  const starters = samples
    .map(s => s?.trim().split(/[.!?]/)[0]) // First sentence
    .filter(Boolean)
    .map(s => s?.split(/\s+/).slice(0, 3).join(' '))
    .filter((s): s is string => s !== undefined); // Filter out undefined

  // Find unique starters (used at least twice)
  const starterCounts = new Map<string, number>();
  for (const starter of starters) {
    starterCounts.set(starter, (starterCounts.get(starter) || 0) + 1);
  }

  for (const [starter, count] of starterCounts) {
    if (count >= 2) {
      patterns.push(`Often starts with: "${starter}..."`);
    }
  }

  return patterns.slice(0, 3); // Top 3 patterns
}

/**
 * Detect overall tone from writing samples
 */
function detectTone(samples: string[]): 'casual' | 'professional' | 'technical' | 'balanced' {
  const allText = samples.join(' ').toLowerCase();

  // Technical indicators
  const technicalWords = ['api', 'database', 'code', 'system', 'server', 'client', 'function', 'endpoint', 'query'];
  const techCount = technicalWords.filter(word => allText.includes(word)).length;

  // Casual indicators
  const casualWords = ['pretty', 'really', 'just', 'kinda', 'sorta', 'bunch', 'stuff'];
  const casualCount = casualWords.filter(word => allText.includes(word)).length;

  // Contractions (casual indicator)
  const contractionMatches = allText.match(/\b(i'm|we're|it's|that's|don't|won't|can't|hasn't)\b/g);
  const contractionCount = contractionMatches ? contractionMatches.length : 0;

  // Formal indicators
  const formalWords = ['however', 'furthermore', 'additionally', 'consequently', 'therefore'];
  const formalCount = formalWords.filter(word => allText.includes(word)).length;

  // Determine tone
  if (techCount >= 3 && casualCount === 0) return 'technical';
  if (casualCount >= 2 || contractionCount >= 3) return 'casual';
  if (formalCount >= 2) return 'professional';
  return 'balanced';
}

/**
 * Analyze user's writing voice from their work entries
 */
export function analyzeUserVoice(workEntries: WorkEntry[]): VoiceProfile {
  // Extract summaries from recent work entries
  const samples = workEntries
    .slice(0, 20) // Last 20 entries
    .map(entry => entry.summary)
    .filter(Boolean)
    .filter(s => s.length > 10); // Filter out very short entries

  // If no samples, return default profile
  if (samples.length === 0) {
    return {
      sentenceLength: 'medium',
      tone: 'balanced',
      patterns: [],
      examples: [],
      avgWordCount: 0
    };
  }

  // Analyze patterns
  const avgSentenceLength = calculateAvgSentenceLength(samples);
  const commonPhrases = extractCommonPhrases(samples);
  const toneIndicators = detectTone(samples);

  // Calculate average word count
  const avgWordCount = Math.round(
    samples.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / samples.length
  );

  return {
    sentenceLength:
      avgSentenceLength < 12 ? 'short' :
      avgSentenceLength < 20 ? 'medium' : 'long',
    tone: toneIndicators,
    patterns: commonPhrases,
    examples: samples.slice(0, 3), // Include 3 examples
    avgWordCount
  };
}

/**
 * Format voice profile for AI prompt
 */
export function formatVoiceProfileForPrompt(profile: VoiceProfile): string {
  if (profile.examples.length === 0) {
    return `
Writing Style: Natural and conversational.
    `.trim();
  }

  return `
Writing Style Guidelines (based on user's work logs):
- Sentence length: ${profile.sentenceLength} (avg ${profile.avgWordCount} words per entry)
- Tone: ${profile.tone}
${profile.patterns.length > 0 ? `- ${profile.patterns.join('\n- ')}` : ''}

Examples of how this user writes:
${profile.examples.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}

IMPORTANT: Match this writing style. Write how THEY would write, not how you think it should sound.
Use similar sentence structure, word choice, and tone.
  `.trim();
}
