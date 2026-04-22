import OpenAI from 'openai';
import { AIMessage, AIOptions, AIProvider, AIResponse } from '../ai.types';
import { env } from '../../../config/env';
import { logger } from '../../../shared/utils/logger';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey: env.ai.openaiApiKey });
    this.model = model;
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    logger.info(`OpenAI respuesta generada — modelo: ${this.model}, tokens: ${tokensUsed}`);

    return { content, tokensUsed, model: this.model };
  }

  async classify(prompt: string, maxTokens = 300): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content?.trim() || 'COLD';
  }
}
