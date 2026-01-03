/**
 * REDACTION Rules for AI Prompts
 * Based on legacy Edge Function format that worked perfectly with all providers
 */

export const REDACTION_RULES = `
CRITICAL - REDACTION RULES:
Replace sensitive information with placeholders:
- Client names, company names → [CLIENT]
- Specific dollar amounts → [AMOUNT]
- Personal names → [NAME]
- Email addresses → [EMAIL]
- Phone numbers → [PHONE]
- Project names → [PROJECT]
`;

/**
 * Get REDACTION rules (same for all contexts)
 */
export function getRedactionRulesForContext(_context: 'summary' | 'chat' | 'extract'): string {
  return REDACTION_RULES;
}
