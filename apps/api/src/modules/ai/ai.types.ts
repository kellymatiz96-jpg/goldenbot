// Tipos compartidos del módulo de IA

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
  classify(prompt: string, maxTokens?: number): Promise<string>;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
}
