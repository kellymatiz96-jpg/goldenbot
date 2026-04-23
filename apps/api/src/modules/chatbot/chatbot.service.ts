import { prisma } from '../../config/database';
import { getIO } from '../../config/socket';
import { getAIProvider } from '../ai/ai.factory';
import { buildSystemPrompt, buildChatMessages } from '../ai/prompt.builder';
import { logger } from '../../shared/utils/logger';
import { markLeadAsResponded } from '../remarketing/remarketing.service';
import { sendPushToClient } from '../notifications/notifications.service';

export interface IncomingMessage {
  channelType: 'WHATSAPP' | 'INSTAGRAM' | 'WEBCHAT';
  externalId: string;       // ID único del usuario en ese canal (ej: número de WhatsApp)
  clientSlug: string;       // Slug del cliente (ej: "cliente-demo")
  content: string;          // Texto del mensaje
  leadName?: string;        // Nombre del lead si está disponible
}

export async function processIncomingMessage(incoming: IncomingMessage): Promise<string> {
  // 1. Buscar el cliente por slug
  const client = await prisma.client.findUnique({
    where: { slug: incoming.clientSlug },
    include: { businessInfo: true },
  });

  if (!client || !client.isActive) {
    logger.warn(`Cliente no encontrado o inactivo: ${incoming.clientSlug}`);
    return '';
  }

  // 2. Buscar o crear el canal automáticamente
  let channel = await prisma.channel.findFirst({
    where: { clientId: client.id, type: incoming.channelType },
  });

  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        clientId: client.id,
        type: incoming.channelType,
        isActive: true,
      },
    });
    logger.info(`Canal ${incoming.channelType} creado automáticamente para cliente ${client.slug}`);
  }

  if (!channel.isActive) {
    logger.warn(`Canal ${incoming.channelType} no activo para cliente ${client.slug}`);
    return '';
  }

  // 3. Buscar o crear el lead (único por clientId + externalId + source)
  let lead = await prisma.lead.findFirst({
    where: {
      clientId: client.id,
      externalId: incoming.externalId,
      source: incoming.channelType,
    },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        clientId: client.id,
        externalId: incoming.externalId,
        source: incoming.channelType,
        phone: incoming.channelType === 'WHATSAPP' ? incoming.externalId : undefined,
        name: incoming.leadName || null,
        temperature: 'COLD',
      },
    });
  } else if (incoming.leadName && !lead.name) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: { name: incoming.leadName },
    });
  }

  // 4. Buscar conversación activa o crear una nueva
  let conversation = await prisma.conversation.findFirst({
    where: {
      clientId: client.id,
      leadId: lead.id,
      channelId: channel.id,
      status: { not: 'CLOSED' },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 20,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        leadId: lead.id,
        channelId: channel.id,
        status: 'BOT_ACTIVE',
      },
      include: { messages: true },
    });

    // Emitir nueva conversación a los agentes conectados
    emitToClient(client.id, 'conversation:created', { conversationId: conversation.id });
  }

  // 5. Guardar el mensaje del usuario
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      clientId: client.id,
      role: 'user',
      content: incoming.content,
    },
  });

  emitToClient(client.id, 'message:new', {
    conversationId: conversation.id,
    role: 'user',
    content: incoming.content,
    createdAt: new Date().toISOString(),
  });

  // 6. Si el lead responde, sacarlo del remarketing automáticamente
  markLeadAsResponded(lead.id).catch(() => {});

  // 7. Si un agente está atendiendo, el bot NO responde pero sí notifica al agente
  if (conversation.status === 'AGENT_ACTIVE') {
    logger.info(`Conversación ${conversation.id} en modo agente, bot no responde`);
    sendPushToClient(client.id, {
      title: 'Mensaje nuevo',
      body: `${lead.name || incoming.externalId}: ${incoming.content}`,
      conversationId: conversation.id,
    }).catch(() => {});
    return '';
  }

  // 8. Verificar palabras clave para escalar a humano
  const businessInfo = client.businessInfo;
  const humanKeywords = Array.isArray(businessInfo?.humanKeywords)
    ? (businessInfo.humanKeywords as string[])
    : [];

  const wantsHuman = humanKeywords.some((kw) =>
    incoming.content.toLowerCase().includes(kw.toLowerCase())
  );

  if (wantsHuman) {
    await handleEscalation(client.id, conversation.id, lead.id);
    const escalationMsg = 'Entendido, voy a conectarte con un agente ahora mismo. Por favor espera un momento.';
    await saveAndEmitBotMessage(client.id, conversation.id, escalationMsg);
    sendPushToClient(client.id, {
      title: 'Lead solicita agente humano',
      body: `${lead.name || incoming.externalId} quiere hablar con una persona`,
      conversationId: conversation.id,
    }).catch(() => {});
    return escalationMsg;
  }

  // 8b. Si el negocio agenda citas y el bot YA pidió los datos, confirmar y escalar sin IA
  const conversionGoal = businessInfo?.conversionGoal?.toLowerCase() || '';
  const isAppointmentBusiness = conversionGoal === 'appointment' ||
    ['cita', 'reserva', 'turno', 'consulta', 'agenda'].some((w) => conversionGoal.includes(w));

  if (isAppointmentBusiness) {
    const lastBotMsg = conversation.messages
      .filter((m) => m.role === 'bot')
      .at(-1)?.content || '';

    // Detectar si el bot ya preguntó por los datos de la cita
    const botAlreadyAskedForData =
      lastBotMsg.includes('registrar tu solicitud') ||
      (lastBotMsg.includes('nombre') && lastBotMsg.includes('servicio'));

    if (botAlreadyAskedForData) {
      const confirmMsg = '¡Perfecto! Ya tenemos tu solicitud. Nuestro equipo te contactará en breve para confirmar todos los detalles. 😊';
      await saveAndEmitBotMessage(client.id, conversation.id, confirmMsg);
      await handleEscalation(client.id, conversation.id, lead.id);
      return confirmMsg;
    }
  }

  // 9. Llamar a la IA y generar respuesta
  try {
    const aiProvider = await getAIProvider(client.id);
    const systemPrompt = buildSystemPrompt(businessInfo);
    const messages = buildChatMessages(
      systemPrompt,
      conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      incoming.content
    );

    const aiResponse = await aiProvider.chat(messages);
    const rawReply = aiResponse.content;

    // Detectar marcador de escalación de cita y eliminarlo del mensaje visible
    const shouldEscalate = rawReply.includes('[CONECTAR_AGENTE]');
    const botReply = rawReply.replace('[CONECTAR_AGENTE]', '').trim();

    // 10. Guardar y emitir respuesta del bot
    await saveAndEmitBotMessage(client.id, conversation.id, botReply);

    // 11. Escalar al agente si el bot recopiló todos los datos de la cita
    if (shouldEscalate) {
      handleEscalation(client.id, conversation.id, lead.id).catch((err) =>
        logger.error('Error al escalar conversación de cita:', err)
      );
    }

    // 12. Clasificar temperatura en segundo plano
    const userMessageCount = conversation.messages.filter((m) => m.role === 'user').length + 1;
    if (userMessageCount >= 2) {
      const fullText = conversation.messages.map((m) => m.content).join('\n') + '\n' + incoming.content;
      classifyTemperature(client.id, lead.id, conversation.id, fullText).catch((err) =>
        logger.error('Error clasificando temperatura:', err)
      );
    }

    return botReply;
  } catch (error) {
    logger.error('Error al llamar a la IA:', error);
    const fallback = 'Disculpa, tuve un problema técnico. ¿Puedes repetir tu mensaje?';
    await saveAndEmitBotMessage(client.id, conversation.id, fallback);
    return fallback;
  }
}

// Guarda mensaje del bot y lo emite por Socket.io
async function saveAndEmitBotMessage(clientId: string, conversationId: string, content: string) {
  await prisma.message.create({
    data: { conversationId, clientId, role: 'bot', content },
  });
  emitToClient(clientId, 'message:new', {
    conversationId,
    role: 'bot',
    content,
    createdAt: new Date().toISOString(),
  });
  emitToClient(clientId, 'conversation:new_message', {
    conversationId,
    role: 'bot',
    content,
    createdAt: new Date().toISOString(),
  });
}

// Emite evento a todos los conectados en el room del cliente
function emitToClient(clientId: string, event: string, data: object) {
  try {
    getIO().to(`client:${clientId}`).emit(event, data);
  } catch {
    logger.warn(`Socket.io no disponible para emitir: ${event}`);
  }
}

// Escala la conversación a agente humano
async function handleEscalation(clientId: string, conversationId: string, leadId: string) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'AGENT_ACTIVE' },
  });

  await prisma.alert.create({
    data: {
      clientId,
      type: 'HOT_LEAD_NO_RESPONSE',
      title: 'Lead solicitó agente humano',
      message: 'Un lead escribió una palabra clave y solicita hablar con una persona',
      metadata: { conversationId, leadId },
    },
  });

  emitToClient(clientId, 'conversation:status_changed', { conversationId, status: 'AGENT_ACTIVE' });
  emitToClient(clientId, 'alert:new', {
    type: 'HUMAN_REQUESTED',
    conversationId,
    message: 'Un lead solicitó hablar con un agente',
  });
}

// Clasifica temperatura del lead usando IA
async function classifyTemperature(
  clientId: string,
  leadId: string,
  conversationId: string,
  conversationText: string
) {
  const aiProvider = await getAIProvider(clientId);

  const prompt = `Analiza los mensajes del CLIENTE (no del asistente) en esta conversación con un chatbot de ventas.
Clasifica al cliente en UNA de estas categorías basándote SOLO en lo que escribió el cliente:

- COLD: Saludos simples ("Hola", "Buenos días", "Buenas"), mensajes de prueba, o frases cortas sin ninguna pregunta sobre servicios, precios o disponibilidad. Si el cliente no menciona nada concreto del negocio → COLD.
- WARM: El cliente hace preguntas sobre servicios, precios, horarios o disponibilidad, pero sin decir que quiere comprar o reservar. Ejemplo: "¿qué tratamientos tienen?", "¿cuánto cuesta?", "¿en qué zona están?".
- HOT: El cliente expresa intención de comprar, reservar o contratar. Basta con que lo diga de cualquier forma: "me gustaría agendar", "quiero reservar", "quiero una cita", "me interesa el servicio", "¿cuándo puedo ir?", "¿tienen disponibilidad?", "me lo llevo", "quiero cotizar". Si el cliente dice que QUIERE algo concreto del negocio → HOT.

Regla: ante la duda entre COLD y WARM → COLD. Si el cliente expresa que quiere algo, aunque sea con "me gustaría" o "quisiera" → HOT.

Conversación:
${conversationText}

Responde SOLO con una palabra: COLD, WARM o HOT`;

  const result = await aiProvider.classify(prompt);
  const temperature = (['COLD', 'WARM', 'HOT'] as const).includes(
    result.trim().toUpperCase() as 'COLD' | 'WARM' | 'HOT'
  )
    ? (result.trim().toUpperCase() as 'COLD' | 'WARM' | 'HOT')
    : 'COLD';

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  // La temperatura solo sube automáticamente (COLD→WARM→HOT), nunca baja.
  // Para bajar la temperatura, el agente lo hace manualmente desde el panel.
  const tempOrder: Record<string, number> = { COLD: 0, WARM: 1, HOT: 2 };
  const wouldUpgrade = tempOrder[temperature] > tempOrder[lead?.temperature ?? 'COLD'];

  if (lead && wouldUpgrade) {
    await prisma.lead.update({ where: { id: leadId }, data: { temperature } });

    // Guardar en el historial de temperatura
    await prisma.temperatureLog.create({
      data: {
        leadId,
        temperature,
        reason: `Clasificación automática: subió de ${lead.temperature} a ${temperature}`,
        changedBy: 'ai',
      },
    });

    // Si se volvió caliente, crear alerta
    if (temperature === 'HOT') {
      await prisma.alert.create({
        data: {
          clientId,
          type: 'HOT_LEAD_NO_RESPONSE',
          title: 'Lead caliente detectado',
          message: 'Un lead fue clasificado como CALIENTE — atender pronto',
          metadata: { leadId, conversationId },
        },
      });

      emitToClient(clientId, 'alert:new', {
        type: 'HOT_LEAD',
        leadId,
        conversationId,
        message: 'Lead caliente detectado — ¡atender ya!',
      });
    }

    logger.info(`Lead ${leadId}: ${lead.temperature} → ${temperature}`);
  }
}
