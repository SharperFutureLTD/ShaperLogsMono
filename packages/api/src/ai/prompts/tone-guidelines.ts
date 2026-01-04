/**
 * Tone Guidelines for Human-Sounding AI Content
 *
 * These guidelines help the AI avoid robotic corporate speak and write more naturally.
 */

export const toneGuidelines = {
  // Words/phrases to AVOID (AI red flags & corporate buzzwords)
  avoid: [
    "leverage", "utilize", "spearhead", "drive", "actionable insights",
    "synergy", "best practices", "going forward", "touch base",
    "circle back", "deep dive", "low-hanging fruit", "move the needle",
    "drill down", "bandwidth", "seamless", "robust", "innovative",
    "cutting-edge", "world-class", "game-changer", "thought leader",
    "paradigm shift", "core competency", "value-add", "stakeholder",
    "ecosystem", "holistic", "scalable", "disruptive", "transformative",
    "empower", "optimize", "strategize", "incentivize", "monetize",
    "I'm thrilled to share", "I'm excited to announce", "deeply engaged",
    "highly productive", "key milestones", "focusing on enhancing"
  ],

  // Natural alternatives (prefer these)
  prefer: [
    "use", "led", "built", "managed", "improved", "created",
    "reduced", "increased", "developed", "launched", "solved",
    "designed", "implemented", "achieved", "delivered", "shipped",
    "wrote", "fixed", "helped", "made", "started", "finished"
  ],

  // Human writing patterns
  patterns: [
    "Vary sentence length (mix short and long)",
    "Use contractions naturally (I'm, we've, it's)",
    "Start sentences differently (avoid repetitive structure)",
    "Include personal pronouns when appropriate (I, we, my)",
    "Be specific with numbers (not 'many' but '47')",
    "Show personality (appropriate to context)",
    "Use active voice over passive",
    "Write conversationally, not formally",
    "Avoid hedging (might, could, potentially)",
    "Be direct and confident"
  ]
} as const;

/**
 * Get tone guidelines formatted for AI prompts
 */
export function getToneGuidelines(): string {
  return `
Write naturally as a human would:
- No corporate buzzwords or jargon
- No formulaic AI patterns (avoid: ${toneGuidelines.avoid.slice(0, 5).join(', ')}, etc.)
- Direct, confident tone
- Varied sentence structure
- Use specific numbers over vague quantifiers
`.trim();
}
