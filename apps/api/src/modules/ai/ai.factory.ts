import { prisma } from '../../config/database';
import { AIProvider } from './ai.types';
import { OpenAIProvider } from './providers/openai.provider';

// Devuelve el proveedor de IA correcto según el plan del cliente
export async function getAIProvider(clientId: string): Promise<AIProvider> {
  const aiConfig = await prisma.aIConfig.findUnique({ where: { clientId } });

  if (!aiConfig) {
    // Sin configuración, usar el modelo más económico por defecto
    return new OpenAIProvider('gpt-4o-mini');
  }

  // Por ahora solo tenemos OpenAI. En Fase posterior se agrega Anthropic.
  if (aiConfig.chatbotProvider === 'OPENAI') {
    const model = aiConfig.chatbotModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    return new OpenAIProvider(model);
  }

  // Fallback
  return new OpenAIProvider('gpt-4o-mini');
}
