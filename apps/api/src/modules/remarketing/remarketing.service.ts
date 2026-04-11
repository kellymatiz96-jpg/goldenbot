import { prisma } from '../../config/database';
import { getIO } from '../../config/socket';
import { logger } from '../../shared/utils/logger';

// -------------------------------------------------------
// CREAR CAMPAÑA
// -------------------------------------------------------
export async function createCampaign(clientId: string, data: {
  name: string;
  message: string;
  inactiveDays: number;
  temperatureFilter?: string;
}) {
  return prisma.remarketingCampaign.create({
    data: {
      clientId,
      name: data.name,
      messages: [data.message],
      inactiveDays: data.inactiveDays,
      isActive: true,
    },
  });
}

// -------------------------------------------------------
// LISTAR CAMPAÑAS
// -------------------------------------------------------
export async function getCampaigns(clientId: string) {
  const campaigns = await prisma.remarketingCampaign.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });

  // Agregar conteo de envíos por campaña
  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const sent = await prisma.remarketingQueue.count({
        where: { campaignId: c.id },
      });
      const responded = await prisma.remarketingQueue.count({
        where: { campaignId: c.id, status: 'SKIPPED' },
      });
      return { ...c, stats: { sent, responded } };
    })
  );

  return withStats;
}

// -------------------------------------------------------
// ACTIVAR / DESACTIVAR CAMPAÑA
// -------------------------------------------------------
export async function toggleCampaign(clientId: string, campaignId: string, isActive: boolean) {
  return prisma.remarketingCampaign.update({
    where: { id: campaignId, clientId },
    data: { isActive },
  });
}

// -------------------------------------------------------
// JOB — Detectar leads inactivos y encolarlos
// Se llama cada hora desde el scheduler
// -------------------------------------------------------
export async function runRemarketingJob() {
  logger.info('[Remarketing] Iniciando job de remarketing...');

  // Buscar todas las campañas activas
  const campaigns = await prisma.remarketingCampaign.findMany({
    where: { isActive: true },
    include: { client: true },
  });

  let totalEnqueued = 0;

  for (const campaign of campaigns) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - campaign.inactiveDays);

    // Buscar conversaciones del cliente que no han tenido actividad desde el cutoff
    const inactiveConversations = await prisma.conversation.findMany({
      where: {
        clientId: campaign.clientId,
        status: 'BOT_ACTIVE',  // Solo las que el bot maneja (no las de agente activo)
        lastMessageAt: { lt: cutoffDate },
      },
      include: {
        lead: true,
      },
    });

    for (const conv of inactiveConversations) {
      // Verificar que no esté ya en cola para esta campaña
      const alreadyQueued = await prisma.remarketingQueue.findFirst({
        where: {
          campaignId: campaign.id,
          leadId: conv.leadId,
          status: { in: ['PENDING', 'SENT'] },
        },
      });

      if (alreadyQueued) continue;

      // Agregar a la cola de remarketing
      await prisma.remarketingQueue.create({
        data: {
          campaignId: campaign.id,
          leadId: conv.leadId,
          scheduledFor: new Date(),
          status: 'PENDING',
          messageIndex: 0,
        },
      });

      totalEnqueued++;
      logger.info(`[Remarketing] Lead ${conv.leadId} encolado para campaña "${campaign.name}"`);
    }
  }

  logger.info(`[Remarketing] Job completado — ${totalEnqueued} leads encolados`);

  // Procesar la cola inmediatamente
  await processRemarketingQueue();
}

// -------------------------------------------------------
// PROCESAR COLA — Enviar mensajes pendientes
// -------------------------------------------------------
export async function processRemarketingQueue() {
  const pending = await prisma.remarketingQueue.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
    },
    include: {
      campaign: true,
      lead: {
        include: {
          conversations: {
            where: { status: { not: 'CLOSED' } },
            include: { channel: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
    take: 50, // Procesar máximo 50 a la vez
  });

  for (const item of pending) {
    try {
      const messages = item.campaign.messages as string[];
      const message = messages[item.messageIndex] || messages[0];
      const conversation = item.lead.conversations[0];

      if (!conversation) {
        await prisma.remarketingQueue.update({
          where: { id: item.id },
          data: { status: 'SKIPPED' },
        });
        continue;
      }

      // Guardar el mensaje de remarketing como si fuera del bot
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          clientId: conversation.clientId,
          role: 'bot',
          content: message,
        },
      });

      // Actualizar la conversación con el nuevo lastMessageAt
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Marcar como enviado
      await prisma.remarketingQueue.update({
        where: { id: item.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // Emitir el mensaje por Socket.io para que aparezca en el panel
      try {
        const io = getIO();
        io.to(`client:${conversation.clientId}`).emit('message:new', {
          conversationId: conversation.id,
          role: 'bot',
          content: message,
          createdAt: new Date().toISOString(),
          isRemarketing: true,
        });
      } catch {
        // Socket no disponible, continuar
      }

      logger.info(`[Remarketing] Mensaje enviado al lead ${item.leadId}`);
    } catch (error) {
      logger.error(`[Remarketing] Error procesando item ${item.id}:`, error);
      await prisma.remarketingQueue.update({
        where: { id: item.id },
        data: { status: 'FAILED', error: String(error) },
      });
    }
  }
}

// -------------------------------------------------------
// MARCAR LEAD COMO RESPONDIDO
// Se llama desde el chatbot cuando el lead responde
// -------------------------------------------------------
export async function markLeadAsResponded(leadId: string) {
  await prisma.remarketingQueue.updateMany({
    where: { leadId, status: 'SENT' },
    data: { status: 'SKIPPED' },
  });
}
