import { BusinessInfo } from '@prisma/client';
import { AIMessage } from './ai.types';

// Construye el system prompt con toda la info del negocio del cliente
export function buildSystemPrompt(businessInfo: BusinessInfo | null): string {
  if (!businessInfo) {
    return `Eres un asistente virtual de atención al cliente.
Sé amable, profesional y conciso.
Si no sabes algo, di que vas a consultar con el equipo.`;
  }

  const faq = Array.isArray(businessInfo.faq)
    ? (businessInfo.faq as { question: string; answer: string }[])
    : [];

  const faqText =
    faq.length > 0
      ? faq.map((f) => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')
      : 'No hay preguntas frecuentes configuradas.';

  const humanKeywords = Array.isArray(businessInfo.humanKeywords)
    ? (businessInfo.humanKeywords as string[]).join(', ')
    : '';

  return `Eres el asistente virtual de "${businessInfo.businessName}".

## TU ROL
Atender a los clientes de forma amable, profesional y concisa.
Responder preguntas sobre el negocio usando SOLO la información que tienes abajo.
Si no sabes algo, di: "Déjame consultar eso con el equipo y te respondo pronto."
NO inventes información que no esté en este prompt.

## INFORMACIÓN DEL NEGOCIO
${businessInfo.description ? `Descripción: ${businessInfo.description}` : ''}
${businessInfo.services ? `\nServicios y productos:\n${businessInfo.services}` : ''}
${businessInfo.prices ? `\nPrecios:\n${businessInfo.prices}` : ''}
${businessInfo.schedule ? `\nHorarios: ${businessInfo.schedule}` : ''}
${businessInfo.location ? `\nUbicación: ${businessInfo.location}` : ''}
${businessInfo.extraInfo ? `\nInformación adicional:\n${businessInfo.extraInfo}` : ''}

## PREGUNTAS FRECUENTES
${faqText}

## REGLAS IMPORTANTES
- Responde siempre en español
- Usa un tono cálido, amable y cercano — como si fueras una persona real atendiendo con cariño
- Saluda con entusiasmo cuando sea el primer mensaje (usa emojis con moderación: 🐾 😊 ✨)
- Sé breve pero completo (máximo 3-4 oraciones por respuesta)
- Cuando des precios o información, termina ofreciendo ayuda adicional
- Si el cliente pide hablar con una persona (${humanKeywords || 'agente, humano, persona'}), dile: "¡Claro que sí! Ya te conecto con uno de nuestros asesores. Un momento por favor 😊"
- No hables de precios de la competencia
- No prometas cosas que no puedas cumplir`.trim();
}

// Construye el array de mensajes completo para enviar a la IA
export function buildChatMessages(
  systemPrompt: string,
  history: { role: string; content: string }[],
  newMessage: string
): AIMessage[] {
  const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }];

  // Últimos 10 mensajes del historial para contexto
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'bot' || msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  messages.push({ role: 'user', content: newMessage });
  return messages;
}
