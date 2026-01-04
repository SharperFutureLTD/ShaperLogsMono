/**
 * Format Templates for Different Content Types
 *
 * These templates define the expected structure and format for each content type.
 */

export const formatTemplates = {
  // LinkedIn post: 100-150 words, conversational
  linkedin_post: `
[Hook - attention-grabbing opening, 1 sentence]

[Main content - the story/achievement with 1-2 metrics, 2-3 sentences]

[Reflection or takeaway, 1 sentence]

NO hashtags unless user explicitly requests them.
  `.trim(),

  // Resume: 4-6 bullet points, metric-focused
  resume: `
• [Action verb] [what you did] resulting in [measurable outcome]
• [Action verb] [what you built/led] that [impact with metrics]
• [Action verb] [improvement/change] leading to [quantified result]
• [Action verb] [specific achievement] achieving [specific metric]
  `.trim(),

  // Tech resume: Same as resume but with technical details
  tech_resume: `
• [Action verb] [technical system/feature] using [tech stack] resulting in [measurable outcome]
• [Action verb] [what you built] with [technologies] that [impact with metrics]
• [Action verb] [technical improvement] leading to [quantified result]
  `.trim(),

  // Brag doc: Organized by time period or project
  brag_doc: `
## [Time Period or Project Name]

Key Achievements:
• [Specific achievement with metrics]
• [Impact on team/company/users]
• [Technical or strategic contribution]

Skills Demonstrated: [List 3-5 relevant skills]
  `.trim(),

  // Performance review: 250-300 words, structured by category
  performance_review: `
[Opening statement - overall performance summary]

Key Achievements:
• [Achievement 1 with metrics]
• [Achievement 2 with impact]
• [Achievement 3 with outcomes]

Skills & Growth:
[1-2 sentences on skills developed or demonstrated]

Areas of Impact:
[1-2 sentences on broader team/company impact]
  `.trim(),

  // Sales report: Numbers-focused, concise
  sales_report: `
Period: [Time period]

Results:
• [Metric 1]: [Value] ([% change from target/previous period])
• [Metric 2]: [Value] ([context])
• [Metric 3]: [Value] ([context])

Key Wins:
• [Specific deal/achievement]
• [Notable progress/milestone]

Next Steps:
• [Action item or focus area]
  `.trim(),

  // Project summary: High-level overview
  project_summary: `
[Project Name] - [Status]

Objective: [1 sentence - what you set out to accomplish]

Results:
• [Key outcome 1 with metric]
• [Key outcome 2 with impact]

Challenges & Solutions:
[1-2 sentences on major obstacles and how you addressed them]

Next Steps: [1 sentence if applicable]
  `.trim(),

  // Tech blog: Narrative structure
  tech_blog: `
[Hook - interesting opening, problem statement, or surprising insight]

[Context - briefly set up the problem or topic]

[Main content - your solution/approach with examples]

[Results or takeaways - what worked, what you learned]

[Optional: Call-to-action or question for readers]
  `.trim(),

  // Generic fallback for other types
  default: `
[Clear, concise content focused on achievements and outcomes]
[Include specific metrics where applicable]
[Use natural, conversational language]
  `.trim()
} as const;

export type ContentType = keyof typeof formatTemplates;

/**
 * Get format template for a specific content type
 */
export function getFormatTemplate(type: string): string {
  return formatTemplates[type as ContentType] || formatTemplates.default;
}
