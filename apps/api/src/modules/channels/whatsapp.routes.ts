import { Router, Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { processIncomingMessage } from '../chatbot/chatbot.service';
import { logger } from '../../shared/utils/logger';

const router = Router();

/**
 * Middleware que verifica que el mensaje viene realmente de Twilio.
 * Twilio firma cada request con un HMAC-SHA1 usando tu Auth Token.
 * Si la firma no coincide, rechaza el request con 403.
 */
function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Si no hay Auth Token configurado (desarrollo local), dejamos pasar
  if (!authToken) {
    logger.warn('[WhatsApp] TWILIO_AUTH_TOKEN no configurado — saltando validación de firma');
    return next();
  }

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) {
    logger.warn('[WhatsApp] Request sin firma de Twilio — rechazado');
    res.status(403).send('Forbidden');
    return;
  }

  // Reconstruir la URL completa tal como Twilio la ve
  const url = `https://goldenbot-api.onrender.com${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);

  if (!isValid) {
    logger.warn(`[WhatsApp] Firma inválida para ${url} — posible intento de ataque`);
    res.status(403).send('Forbidden');
    return;
  }

  next();
}

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
router.post('/:clientSlug', validateTwilioSignature, async (req: Request, res: Response) => {
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
