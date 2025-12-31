import OpenAI from 'openai';
import type {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
} from '../types';
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '../types';

export class OpenAIProvider implements IAIProvider {
  public readonly name = 'openai' as const;
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.model = config.model || DEFAULT_MODELS.openai;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      // OpenAI supports system messages directly
      const messages: OpenAI.ChatCompletionMessageParam[] = request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: request.temperature || DEFAULT_TEMPERATURE,
        max_tokens: request.maxTokens || DEFAULT_MAX_TOKENS,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
