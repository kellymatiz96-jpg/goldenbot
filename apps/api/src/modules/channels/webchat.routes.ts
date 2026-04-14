import { Router, Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { processIncomingMessage } from '../chatbot/chatbot.service';
import { prisma } from '../../config/database';
import { logger } from '../../shared/utils/logger';

const router = Router();

// El widget se embebe en cualquier web — permitir todos los orígenes
router.use(cors({ origin: '*' }));

const messageSchema = z.object({
  sessionId: z.string().min(1),   // ID único del visitante (generado en el browser)
  clientSlug: z.string().min(1),  // Slug del cliente dueño del widget
  message: z.string().min(1),
  visitorName: z.string().optional(),
});

// POST /webchat/message — recibe mensaje del widget
router.post('/message', async (req: Request, res: Response) => {
  try {
    const data = messageSchema.parse(req.body);

    const reply = await processIncomingMessage({
      channelType: 'WEBCHAT',
      externalId: data.sessionId,
      clientSlug: data.clientSlug,
      content: data.message,
      leadName: data.visitorName,
    });

    // Obtener el conversationId para que el widget pueda unirse al room de socket
    let conversationId: string | undefined;
    try {
      const client = await prisma.client.findUnique({ where: { slug: data.clientSlug } });
      if (client) {
        const conv = await prisma.conversation.findFirst({
          where: {
            clientId: client.id,
            lead: { externalId: data.sessionId, source: 'WEBCHAT' },
            status: { not: 'CLOSED' },
          },
          select: { id: true },
        });
        conversationId = conv?.id;
      }
    } catch { /* no bloquear si falla */ }

    res.json({ success: true, reply, conversationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Datos inválidos' });
      return;
    }
    logger.error('Error en webchat:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// GET /webchat/config/:clientSlug — devuelve config pública del widget
router.get('/config/:clientSlug', async (req: Request, res: Response) => {
  try {
    const { clientSlug } = req.params;

    const client = await prisma.client.findUnique({
      where: { slug: clientSlug },
      include: { businessInfo: true },
    });

    if (!client || !client.isActive) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      return;
    }

    res.json({
      success: true,
      config: {
        businessName: client.businessInfo?.businessName || client.name,
        welcomeMessage: client.businessInfo?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?',
        primaryColor: '#f59e0b',
      },
    });
  } catch (error) {
    logger.error('Error obteniendo config del webchat:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
