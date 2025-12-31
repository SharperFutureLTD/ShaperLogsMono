import Anthropic from '@anthropic-ai/sdk';
import type {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
} from '../types';
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '../types';

export class ClaudeProvider implements IAIProvider {
  public readonly name = 'claude' as const;
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || DEFAULT_MODELS.claude;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      // Separate system messages from user/assistant messages
      const systemMessages = request.messages.filter((m) => m.role === 'system');
      const conversationMessages = request.messages.filter((m) => m.role !== 'system');

      // Combine system prompts
      const systemPrompt = [
        request.systemPrompt,
        ...systemMessages.map((m) => m.content),
      ]
        .filter(Boolean)
        .join('\n\n');

      // Convert messages to Claude format
      const messages: Anthropic.MessageParam[] = conversationMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: request.temperature || DEFAULT_TEMPERATURE,
        system: systemPrompt || undefined,
        messages,
      });

      // Extract text content
      const content =
        response.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as Anthropic.TextBlock).text)
          .join('\n') || '';

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
