/**
 * AI Provider Types
 * Abstraction layer for multi-provider AI support (Claude, OpenAI, Gemini)
 */

export type AIProvider = "claude" | "openai" | "gemini";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: "json" | "text"; // Force JSON response format
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  name: AIProvider;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: "claude-3-haiku-20240307",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
};

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
