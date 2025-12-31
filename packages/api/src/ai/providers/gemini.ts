import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
} from '../types';
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE } from '../types';

export class GeminiProvider implements IAIProvider {
  public readonly name = 'gemini' as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || DEFAULT_MODELS.gemini;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      // Build system instruction
      const systemMessages = request.messages.filter((m) => m.role === 'system');
      const systemInstruction = [
        request.systemPrompt,
        ...systemMessages.map((m) => m.content),
      ]
        .filter(Boolean)
        .join('\n\n');

      // Build conversation history
      const conversationMessages = request.messages.filter((m) => m.role !== 'system');

      // Gemini expects alternating user/model messages
      const history = conversationMessages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = conversationMessages[conversationMessages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: request.temperature || DEFAULT_TEMPERATURE,
          maxOutputTokens: request.maxTokens,
        },
        systemInstruction: systemInstruction || undefined,
      });

      const result = await chat.sendMessage(lastMessage?.content || '');
      const response = await result.response;
      const content = response.text();

      return {
        content,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
