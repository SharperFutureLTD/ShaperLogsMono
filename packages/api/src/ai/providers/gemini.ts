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
      console.log('🔧 Gemini Provider - maxTokens requested:', request.maxTokens);
      console.log('🔧 Gemini Provider - temperature:', request.temperature);
      console.log('🔧 Gemini Provider - responseFormat:', request.responseFormat);

      // Build system instruction
      const systemMessages = request.messages.filter((m) => m.role === 'system');
      const systemInstructionText = [
        request.systemPrompt,
        ...systemMessages.map((m) => m.content),
      ]
        .filter(Boolean)
        .join('\n\n');

      const generationConfig = {
        temperature: request.temperature || DEFAULT_TEMPERATURE,
        maxOutputTokens: request.maxTokens || 8192, // Ensure a high default
        ...(request.responseFormat === 'json' && { responseMimeType: 'application/json' }),
      };

      console.log('🔧 Gemini generationConfig:', JSON.stringify(generationConfig, null, 2));

      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemInstructionText
          ? {
              role: 'system',
              parts: [{ text: systemInstructionText }],
            }
          : undefined,
        generationConfig, // Apply config at model level too
      });

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
        generationConfig, // Apply the same config here
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
