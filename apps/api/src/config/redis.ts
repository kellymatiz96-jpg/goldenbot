import { Redis } from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redis.url, {
  maxRetriesPerRequest: null, // Requerido por BullMQ
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Conectado exitosamente');
});

redis.on('error', (err) => {
  console.error('[Redis] Error de conexión:', err.message);
});
