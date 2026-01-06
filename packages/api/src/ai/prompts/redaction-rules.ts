/**
 * REDACTION Rules for AI Prompts
 * Context-aware redaction that protects sensitive info without over-redacting
 */

export const REDACTION_RULES = `
REDACTION RULES - Apply thoughtfully, not broadly:

ALWAYS redact:
- Specific monetary amounts (salary, compensation, deal values, revenue) → [AMOUNT]
- Email addresses → [EMAIL]
- Phone numbers → [PHONE]

REDACT with context:
- Client/customer company names (when described as "client", "customer", "we worked with") → [CLIENT]
- Internal project codenames (proprietary names like "Project Phoenix", not public/open-source) → [PROJECT]
- Confidential personal names of clients/colleagues when discussed in sensitive context → [NAME]

DO NOT redact:
- Well-known public brands mentioned casually (e.g., "I bought a Cadbury bar", "I use Slack")
- The user's own employer name
- Academic course codes (e.g., "CS101", "MATH200")
- University or school names
- Open-source or publicly known project names
- Job titles or role descriptions
- Industry terms or technologies
`;

/**
 * Get REDACTION rules (same for all contexts)
 */
export function getRedactionRulesForContext(_context: 'summary' | 'chat' | 'extract'): string {
  return REDACTION_RULES;
}
