import webpush from 'web-push';
import { prisma } from '../../config/database';
import { logger } from '../../shared/utils/logger';

// Configurar VAPID keys (generadas una sola vez y guardadas como env vars)
function setupWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'admin@goldenbot.com';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  }
}

setupWebPush();

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function deleteSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToClient(
  clientId: string,
  payload: { title: string; body: string; conversationId?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return; // No hay VAPID keys configuradas
  }

  // Obtener todos los agentes del cliente que tienen suscripción push
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        clientId,
        isActive: true,
      },
    },
  });

  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
      } catch (err: unknown) {
        // Si la suscripción expiró, la eliminamos
        if (err && typeof err === 'object' && 'statusCode' in err &&
            (err.statusCode === 410 || err.statusCode === 404)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          logger.info(`[Push] Suscripción expirada eliminada: ${sub.endpoint}`);
        } else {
          logger.error('[Push] Error enviando notificación:', err);
        }
      }
    })
  );
}
