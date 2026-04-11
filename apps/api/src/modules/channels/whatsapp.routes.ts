import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { processIncomingMessage } from '../chatbot/chatbot.service';
import { logger } from '../../shared/utils/logger';

const router = Router();

/**
 * POST /webhook/whatsapp/:clientSlug
 *
 * Twilio llama a este endpoint cada vez que llega un mensaje de WhatsApp.
 * La URL que debes configurar en Twilio Sandbox es:
 *   https://goldenbot-api.onrender.com/webhook/whatsapp/TU_CLIENTE_SLUG
 *
 * Ejemplo para cliente-demo:
 *   https://goldenbot-api.onrender.com/webhook/whatsapp/cliente-demo
 */
router.post('/:clientSlug', async (req: Request, res: Response) => {
  try {
    const { clientSlug } = req.params;

    // Twilio envía los datos como form urlencoded
    const from: string = req.body.From || '';       // "whatsapp:+5491123456789"
    const body: string = req.body.Body || '';       // Texto del mensaje
    const profileName: string = req.body.ProfileName || ''; // Nombre en WhatsApp

    if (!from || !body) {
      res.status(400).send('');
      return;
    }

    // Quitar el prefijo "whatsapp:" para obtener solo el número
    const externalId = from.replace('whatsapp:', '');

    logger.info(`[WhatsApp] Mensaje de ${externalId} → cliente "${clientSlug}": ${body}`);

    const reply = await processIncomingMessage({
      channelType: 'WHATSAPP',
      externalId,
      clientSlug,
      content: body,
      leadName: profileName || undefined,
    });

    // Responder a Twilio con TwiML (formato que Twilio espera)
    const twiml = new twilio.twiml.MessagingResponse();
    if (reply) {
      twiml.message(reply);
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('[WhatsApp] Error procesando webhook:', error);
    // Responder vacío para que Twilio no reintente
    res.type('text/xml');
    res.send('<Response></Response>');
  }
});

export default router;
