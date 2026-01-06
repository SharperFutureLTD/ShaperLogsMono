/**
 * Content-Type-Specific Instructions
 *
 * Each content type has tailored guidelines for tone, structure, and format.
 */

interface ContentTypeInstruction {
  instructions: string[];
  tone: string;
  avoid: string[];
  wordCount?: string;
}

export const contentTypeInstructions: Record<string, ContentTypeInstruction> = {
  // HIGH PRIORITY TYPES
  linkedin_post: {
    instructions: [
      "Write 100-150 words (3-4 short paragraphs)",
      "Start with a hook that grabs attention (direct statement, question, or specific insight)",
      "Focus on ONE key achievement or insight",
      "Include 1-2 specific metrics or outcomes",
      "End with a reflection or subtle takeaway",
      "Use line breaks between paragraphs for readability",
      "Add 3-4 hashtags at the end: ALWAYS start with #SharperLogs, then add 3 industry-specific hashtags",
      "NO meta commentary like 'Here's a LinkedIn post...'"
    ],
    tone: "Conversational, authentic, like you're talking to a colleague over coffee",
    avoid: [
      "Multiple numbered options (Option 1, Option 2)",
      "Corporate buzzwords (leverage, synergy, spearhead, thrilled to share)",
      "Overly long paragraphs (max 3 sentences each)",
      "Generic phrases (excited to announce, deeply engaged, highly productive)",
      "Bullet points with bold headers (too structured)",
      "Too many hashtags (max 4, not 9+)",
      "Generic hashtags (#Success #Growth #Leadership #Innovation)",
      "Meta commentary or framing text"
    ],
    wordCount: "100-150 words"
  },

  resume: {
    instructions: [
      "Generate 4-6 bullet points highlighting key achievements",
      "Start each bullet with a strong action verb (built, led, reduced, increased)",
      "Include metrics wherever possible (%, $, time saved, users impacted)",
      "Keep each bullet to 1-2 lines maximum",
      "Focus on outcomes and impact, not just responsibilities",
      "Use past tense for previous roles, present tense for current role",
      "Be specific with numbers and timeframes"
    ],
    tone: "Professional but not stuffy, achievement-focused",
    avoid: [
      "Buzzwords (dynamic, results-oriented, team player)",
      "Vague statements (helped with, assisted in)",
      "Passive voice (was responsible for)",
      "Multiple bullet variations to choose from",
      "Long-winded explanations"
    ],
    wordCount: "4-6 bullets, 1-2 lines each"
  },

  tech_resume: {
    instructions: [
      "Generate 4-6 bullet points highlighting technical achievements",
      "Start with action verb + technical context (Built microservice architecture, Optimized database queries)",
      "Include specific technologies used (React, Python, AWS, etc.)",
      "Quantify impact (latency reduced by X%, processed Y requests/sec)",
      "Balance technical depth with business outcomes",
      "Keep each bullet to 1-2 lines",
      "Use technical terms accurately, avoid buzzwords"
    ],
    tone: "Technical but accessible, achievement-focused",
    avoid: [
      "Generic tech buzzwords (scalable, robust, cutting-edge)",
      "Listing technologies without context",
      "Vague metrics (significant improvement, better performance)",
      "Overly complex jargon that obscures the achievement"
    ],
    wordCount: "4-6 bullets, 1-2 lines each"
  },

  brag_doc: {
    instructions: [
      "Organize by time period or project",
      "Use 3-5 bullet points per section",
      "Lead with the most impactful achievements",
      "Include specific metrics for each achievement",
      "Mention skills demonstrated (3-5 per section)",
      "Be direct and confident (you earned these accomplishments)",
      "Focus on results, not effort"
    ],
    tone: "Confident, factual, achievement-focused",
    avoid: [
      "Humble-bragging or hedging",
      "Generic statements without metrics",
      "Long paragraphs (use bullets)",
      "Downplaying achievements"
    ],
    wordCount: "3-5 bullets per section"
  },

  performance_review: {
    instructions: [
      "Write 250-300 words total",
      "Start with overall performance summary (2-3 sentences)",
      "Highlight 3-5 key achievements with metrics",
      "Mention skills developed or demonstrated",
      "Note broader team/company impact",
      "Be specific with examples and numbers",
      "Balance individual contributions with team collaboration"
    ],
    tone: "Professional, confident, balanced",
    avoid: [
      "Generic praise without specifics",
      "Overly humble or self-deprecating",
      "Vague statements (worked hard, did my best)",
      "Long-winded explanations"
    ],
    wordCount: "250-300 words"
  },

  // MEDIUM PRIORITY TYPES
  sales_report: {
    instructions: [
      "Lead with headline numbers (revenue, deals closed, quota attainment)",
      "Show comparison to target or previous period",
      "Highlight 2-3 key wins or notable deals",
      "Keep it concise and scannable",
      "Include context for any significant variances",
      "End with 1-2 next steps or focus areas"
    ],
    tone: "Direct, results-focused, optimistic",
    avoid: [
      "Excuses or lengthy explanations for misses",
      "Generic statements without numbers",
      "Overly complex analysis"
    ],
    wordCount: "150-200 words"
  },

  project_summary: {
    instructions: [
      "One sentence objective (what you set out to accomplish)",
      "2-3 key results with metrics",
      "1-2 sentences on challenges and how you addressed them",
      "Optional: Next steps if project is ongoing",
      "Keep it high-level and scannable"
    ],
    tone: "Clear, concise, outcome-focused",
    avoid: [
      "Excessive technical detail",
      "Long paragraphs",
      "Process descriptions without outcomes"
    ],
    wordCount: "150-200 words"
  },

  tech_blog: {
    instructions: [
      "Start with a hook (problem, insight, or surprising result)",
      "Provide context in 2-3 sentences",
      "Explain your approach or solution with examples",
      "Share results or key takeaways",
      "Optional: End with a question or call-to-action",
      "Write conversationally but technically accurate"
    ],
    tone: "Conversational, educational, authentic",
    avoid: [
      "Academic or overly formal language",
      "Generic introductions",
      "Overly promotional or sales-y"
    ],
    wordCount: "300-500 words"
  },

  // GENERIC FALLBACK
  default: {
    instructions: [
      "Write clearly and concisely",
      "Focus on achievements and outcomes",
      "Include specific metrics where applicable",
      "Use natural, conversational language",
      "Be direct and confident",
      "Provide ONE polished output (no options)"
    ],
    tone: "Professional but natural, achievement-focused",
    avoid: [
      "Corporate buzzwords and jargon",
      "Vague statements",
      "Multiple options or variations",
      "AI-sounding phrases"
    ],
    wordCount: "Appropriate for content type"
  }
};

/**
 * Get content-type-specific instructions
 */
export function getContentTypeInstructions(type: string): string {
  const config = contentTypeInstructions[type] || contentTypeInstructions.default;

  if (!config) {
    return `Write clear, concise content focused on achievements and outcomes.`;
  }

  return `
Content Guidelines:
${config.instructions.map(i => `- ${i}`).join('\n')}

Tone: ${config.tone}

AVOID:
${config.avoid.map(a => `- ${a}`).join('\n')}

Length: ${config.wordCount || 'As appropriate for content type'}
`.trim();
}
