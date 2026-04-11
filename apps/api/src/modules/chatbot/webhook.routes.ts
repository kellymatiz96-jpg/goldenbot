import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { processIncomingMessage } from './chatbot.service';
import { logger } from '../../shared/utils/logger';

const router = Router();

const messageSchema = z.object({
  channelType: z.enum(['WHATSAPP', 'INSTAGRAM', 'WEBCHAT']),
  externalId: z.string().min(1),
  clientSlug: z.string().min(1),
  content: z.string().min(1),
  leadName: z.string().optional(),
});

// POST /webhook/message — recibe un mensaje de cualquier canal
router.post('/message', async (req: Request, res: Response) => {
  try {
    const data = messageSchema.parse(req.body);
    const reply = await processIncomingMessage(data);
    res.json({ success: true, reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Datos inválidos', errors: error.errors });
      return;
    }
    logger.error('Error en webhook:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /webhook/test — para verificar que el webhook funciona
router.get('/test', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Webhook de GoldenBot funcionando' });
});

export default router;
