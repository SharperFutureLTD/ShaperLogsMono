import type {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
} from '../types';
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE } from '../types';

/**
 * GeminiOpenAIProvider - Uses Google's OpenAI-compatible API endpoint
 *
 * This provider uses Google's OpenAI-compatible endpoint instead of the Gemini SDK.
 * This approach:
 * - Supports proper JSON response formatting via response_format
 * - Avoids truncation issues with the native Gemini SDK
 * - Matches the working Lovable implementation
 *
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 */
export class GeminiOpenAIProvider implements IAIProvider {
  public readonly name = 'gemini' as const;
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODELS.gemini;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      console.log('🔧 GeminiOpenAI Provider - Using OpenAI-compatible endpoint');
      console.log('🔧 Model:', this.model);
      console.log('🔧 maxTokens requested:', request.maxTokens);
      console.log('🔧 temperature:', request.temperature);
      console.log('🔧 responseFormat:', request.responseFormat);

      // Build messages in OpenAI format (exactly like Lovable)
      const messages: Array<{ role: string; content: string }> = [];

      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        });
      }

      // Add conversation messages
      messages.push(...request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })));

      // Build request body
      const requestBody: any = {
        model: this.model,
        messages,
        temperature: request.temperature || DEFAULT_TEMPERATURE,
        max_tokens: request.maxTokens || 4096,
      };

      // Add JSON response format if requested (critical for target extraction)
      if (request.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
        console.log('🔧 Forcing JSON response format');
      }

      console.log('🔧 Request body:', JSON.stringify(requestBody, null, 2));

      // Call Google's OpenAI-compatible endpoint
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini OpenAI API error:', response.status, errorText);
        throw new Error(`Gemini OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Received response from Gemini OpenAI API');
      console.log('📊 Response usage:', data.usage);

      const content = data.choices?.[0]?.message?.content || '';
      console.log('📝 Response length:', content.length, 'characters');

      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('❌ GeminiOpenAI API error:', error);
      throw new Error(
        `GeminiOpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
