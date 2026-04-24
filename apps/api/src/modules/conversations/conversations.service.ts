import { ConversationStatus } from '@prisma/client';
import twilio from 'twilio';
import { prisma } from '../../config/database';
import { getIO } from '../../config/socket';
import { AppError } from '../../shared/middlewares/errorHandler';
import { logger } from '../../shared/utils/logger';

export async function getConversations(clientId: string, page = 1, limit = 30) {
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { clientId, status: { not: 'CLOSED' } },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      include: {
        lead: {
          select: { id: true, name: true, phone: true, temperature: true, externalId: true, appointmentBooked: true },
        },
        channel: { select: { type: true } },
        assignedAgent: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    }),
    prisma.conversation.count({ where: { clientId, status: { not: 'CLOSED' } } }),
  ]);

  return { conversations, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getConversationWithMessages(clientId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
      channel: { select: { type: true } },
      assignedAgent: { select: { id: true, name: true } },
      client: { select: { businessInfo: { select: { conversionGoal: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          role: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new AppError('Conversación no encontrada', 404);
  }

  // Verificar que pertenece al cliente autenticado
  if (conversation.clientId !== clientId) {
    throw new AppError('Acceso denegado', 403);
  }

  // Marcar mensajes como leídos
  await prisma.message.updateMany({
    where: { conversationId, isRead: false, role: 'user' },
    data: { isRead: true },
  });

  return conversation;
}

export async function takeOverConversation(
  clientId: string,
  conversationId: string,
  agentId: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.clientId !== clientId) {
    throw new AppError('Conversación no encontrada', 404);
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: ConversationStatus.AGENT_ACTIVE,
      assignedAgentId: agentId,
    },
  });

  try {
    const payload = { conversationId, status: 'AGENT_ACTIVE' };
    getIO().to(`client:${clientId}`).emit('conversation:status_changed', payload);
    getIO().to(`conversation:${conversationId}`).emit('conversation:status_changed', payload);
  } catch { /* ignorar si socket no disponible */ }

  return updated;
}

export async function sendAgentMessage(
  clientId: string,
  conversationId: string,
  content: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true, channel: true },
  });

  if (!conversation || conversation.clientId !== clientId) {
    throw new AppError('Conversación no encontrada', 404);
  }

  // Guardar mensaje en la BD
  const message = await prisma.message.create({
    data: { conversationId, clientId, role: 'agent', content },
  });

  // Actualizar lastMessageAt de la conversación
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Emitir por Socket.io al panel del agente y al widget del visitante
  try {
    const payload = {
      conversationId,
      role: 'agent',
      content,
      createdAt: message.createdAt.toISOString(),
    };
    getIO().to(`client:${clientId}`).emit('message:new', payload);
    // También al room de la conversación para que lo reciba el widget embebido
    getIO().to(`conversation:${conversationId}`).emit('message:new', payload);
  } catch {
    logger.warn('Socket.io no disponible');
  }

  // Si el canal es WhatsApp, enviar el mensaje via Twilio
  if (conversation.channel?.type === 'WHATSAPP') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (accountSid && authToken && conversation.lead?.externalId) {
      try {
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          from: fromNumber,
          to: `whatsapp:${conversation.lead.externalId}`,
          body: content,
        });
        logger.info(`[WhatsApp] Mensaje del agente enviado a ${conversation.lead.externalId}`);
      } catch (err) {
        logger.error('[WhatsApp] Error enviando mensaje del agente via Twilio:', err);
        throw new AppError('Error al enviar el mensaje por WhatsApp', 500);
      }
    }
  }

  return message;
}

export async function releaseConversation(clientId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.clientId !== clientId) {
    throw new AppError('Conversación no encontrada', 404);
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: ConversationStatus.BOT_ACTIVE,
      assignedAgentId: null,
    },
  });

  try {
    const payload = { conversationId, status: 'BOT_ACTIVE' };
    getIO().to(`client:${clientId}`).emit('conversation:status_changed', payload);
    getIO().to(`conversation:${conversationId}`).emit('conversation:status_changed', payload);
  } catch { /* ignorar si socket no disponible */ }

  return updated;
}

export async function markAppointmentBooked(clientId: string, conversationId: string, booked: boolean) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { clientId: true, leadId: true },
  });

  if (!conversation || conversation.clientId !== clientId) {
    throw new AppError('Conversación no encontrada', 404);
  }

  const lead = await prisma.lead.update({
    where: { id: conversation.leadId },
    data: { appointmentBooked: booked },
    select: { id: true, appointmentBooked: true },
  });

  // Al marcar como agendado, cerrar la conversación (ya no está en espera)
  if (booked) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.CLOSED },
    });
    try {
      const payload = { conversationId, status: 'CLOSED' };
      getIO().to(`client:${clientId}`).emit('conversation:status_changed', payload);
      getIO().to(`conversation:${conversationId}`).emit('conversation:status_changed', payload);
    } catch { /* ignorar */ }
  }

  try {
    getIO().to(`client:${clientId}`).emit('lead:appointment_booked', {
      leadId: lead.id,
      conversationId,
      appointmentBooked: lead.appointmentBooked,
    });
  } catch { /* ignorar si socket no disponible */ }

  return lead;
}

export async function getDashboardMetrics(clientId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    conversationsToday,
    coldLeads,
    warmLeads,
    hotLeads,
    activeConversations,
    totalLeads,
    lastMonthLeads,
    recentMessages,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { clientId, createdAt: { gte: today } },
    }),
    prisma.lead.count({ where: { clientId, temperature: 'COLD', isActive: true } }),
    prisma.lead.count({ where: { clientId, temperature: 'WARM', isActive: true } }),
    prisma.lead.count({ where: { clientId, temperature: 'HOT', isActive: true } }),
    prisma.conversation.count({
      where: { clientId, status: { not: 'CLOSED' } },
    }),
    prisma.lead.count({ where: { clientId, isActive: true } }),
    // Leads del mes anterior para comparar
    prisma.lead.count({
      where: {
        clientId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          lt: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    }),
    // Últimos 30 mensajes del bot para calcular tiempo de respuesta
    prisma.message.findMany({
      where: { clientId, role: 'bot' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { createdAt: true, conversationId: true },
    }),
  ]);

  // Conversaciones por día (últimos 7 días) para la gráfica
  const last7Days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      return prisma.conversation
        .count({
          where: { clientId, createdAt: { gte: date, lt: nextDate } },
        })
        .then((count) => ({
          date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
          conversaciones: count,
        }));
    })
  );

  // Score de salud (0-100) — algoritmo simple basado en métricas
  const hotRatio = totalLeads > 0 ? hotLeads / totalLeads : 0;
  const warmRatio = totalLeads > 0 ? warmLeads / totalLeads : 0;
  const activityScore = Math.min(conversationsToday * 5, 30);
  const conversionScore = Math.round(hotRatio * 40 + warmRatio * 20 + activityScore);
  const healthScore = Math.min(Math.max(conversionScore, 0), 100);

  return {
    conversationsToday,
    activeConversations,
    leads: {
      cold: coldLeads,
      warm: warmLeads,
      hot: hotLeads,
      total: totalLeads,
    },
    chartData: last7Days,
    healthScore,
    comparison: {
      leadsThisMonth: totalLeads,
      leadsLastMonth: lastMonthLeads,
      change:
        lastMonthLeads > 0
          ? Math.round(((totalLeads - lastMonthLeads) / lastMonthLeads) * 100)
          : 0,
    },
  };
}
