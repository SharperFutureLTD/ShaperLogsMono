import type { AIProvider, IAIProvider } from './types';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

/**
 * AI Provider Factory
 * Creates and returns the appropriate AI provider based on configuration
 */
export class AIProviderFactory {
  private static instances: Map<AIProvider, IAIProvider> = new Map();

  /**
   * Get an AI provider instance
   * @param provider The provider to use (defaults to env DEFAULT_AI_PROVIDER)
   * @returns IAIProvider instance
   */
  static getProvider(provider?: AIProvider): IAIProvider {
    const selectedProvider = provider || (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'claude';

    // Return cached instance if available
    if (this.instances.has(selectedProvider)) {
      return this.instances.get(selectedProvider)!;
    }

    // Create new instance
    let instance: IAIProvider;

    switch (selectedProvider) {
      case 'claude':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude provider');
        }
        instance = new ClaudeProvider({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        break;

      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY environment variable is required for OpenAI provider');
        }
        instance = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
        });
        break;

      case 'gemini':
        if (!process.env.GOOGLE_AI_API_KEY) {
          throw new Error('GOOGLE_AI_API_KEY environment variable is required for Gemini provider');
        }
        instance = new GeminiProvider({
          apiKey: process.env.GOOGLE_AI_API_KEY,
        });
        break;

      default:
        throw new Error(`Unsupported AI provider: ${selectedProvider}`);
    }

    // Cache instance
    this.instances.set(selectedProvider, instance);

    return instance;
  }

  /**
   * Clear cached provider instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }
}
