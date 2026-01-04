/**
 * AI Prompts Module
 *
 * Centralized prompt management for all AI content generation.
 * Exports functions to build human-sounding, type-specific prompts.
 */

export { getSystemPrompt } from './system-prompts';
export { getContentTypeInstructions } from './content-type-prompts';
export { getFormatTemplate } from './format-templates';
export { getToneGuidelines } from './tone-guidelines';
export { REDACTION_RULES, getRedactionRulesForContext } from './redaction-rules';
export {
  analyzeUserVoice,
  formatVoiceProfileForPrompt,
  type VoiceProfile
} from './voice-analyzer';
