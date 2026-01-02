/**
 * Centralized REDACTION Rules for AI Prompts
 *
 * Provides comprehensive PII detection and replacement instructions for AI models.
 * Used across all endpoints that generate summaries or handle sensitive user data.
 */

export const REDACTION_RULES = `
CRITICAL - REDACTION RULES:
You MUST replace ALL sensitive information with appropriate placeholders.

MANDATORY REPLACEMENTS:
1. Client/Company Information:
   - Client names, company names → [CLIENT]
   - Competitor names → [COMPETITOR]
   - Partner organization names → [PARTNER]

2. Financial Information:
   - Specific dollar/currency amounts → [AMOUNT]
   - Salary figures → [SALARY]
   - Budget numbers → [BUDGET]
   - Account numbers → [ACCOUNT]

3. Personal Information:
   - Personal names (except the user) → [NAME]
   - Email addresses → [EMAIL]
   - Phone numbers → [PHONE]
   - Home/work addresses → [ADDRESS]
   - Social Security Numbers / Tax IDs → [SSN]

4. Technical Information:
   - IP addresses (e.g., 192.168.1.1) → [IP]
   - Internal URLs/domains → [URL]
   - API keys/tokens → [API_KEY]
   - Server names → [SERVER]

5. Identifiers:
   - Employee IDs → [EMP_ID]
   - Project codenames → [PROJECT]
   - Case/ticket numbers → [TICKET]
   - Contract numbers → [CONTRACT]

6. Sensitive Dates (when context-revealing):
   - Employment start/end dates → [DATE]
   - Contract dates → [DATE]
   (Keep generic dates like "in 2024" or "last month")

WHAT TO KEEP (Do NOT redact):
- Counts, percentages, durations (e.g., "3 deals", "50% improvement", "2 hours")
- Generic metrics (e.g., "tasks completed: 5")
- Industry terms, technical skills
- Generic time references ("last week", "Q3", "December")
- The user's own accomplishments and role

DETECTION METHODOLOGY:
- Scan for proper nouns that aren't industry terms
- Identify numeric patterns matching PII (phone: ###-###-####, SSN: ###-##-####)
- Look for email format (xxx@domain.com)
- Detect currency symbols followed by numbers
- Identify quoted names or titles

EXAMPLES:

BAD (Not Redacted):
"Closed deal with Acme Corp for $150,000. John Smith from their finance team signed the contract on 2024-03-15."

GOOD (Properly Redacted):
"Closed deal with [CLIENT] for [AMOUNT]. [NAME] from their finance team signed the contract on [DATE]."

BAD (Over-Redacted):
"Completed [NUMBER] tasks in [TIME] using [SKILL]."

GOOD (Balanced):
"Completed 12 tasks in 3 hours using Python and SQL."

METRICS HANDLING:
- DO redact: "revenue": 150000 → "revenue": "[AMOUNT]"
- DO NOT redact: "deals_closed": 3 → "deals_closed": 3
- DO NOT redact: "completion_rate": 0.95 → "completion_rate": 0.95
`;

/**
 * Get context-specific REDACTION rules
 * @param context The context where redaction is being applied
 * @returns REDACTION rules tailored to the specific context
 */
export const getRedactionRulesForContext = (context: 'summary' | 'chat' | 'extract'): string => {
  const baseRules = REDACTION_RULES;

  if (context === 'chat') {
    return baseRules + `

CONVERSATIONAL CONTEXT:
- Redact as you respond, don't wait for summarization
- If user mentions PII, acknowledge but use placeholders in your response
- Example: User says "I worked with Sarah Jones" → You respond "Great work collaborating with [NAME]!"
`;
  }

  if (context === 'extract') {
    return baseRules + `

EXTRACTION CONTEXT:
- Redact PII in extracted text before returning
- Preserve structure and meaning
- Document metadata can stay (title, page count)
`;
  }

  // summary context (default)
  return baseRules;
};
