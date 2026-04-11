import { runRemarketingJob } from './remarketing.service';
import { logger } from '../../shared/utils/logger';

let intervalId: NodeJS.Timeout | null = null;

// Inicia el scheduler — corre cada hora
export function startRemarketingScheduler() {
  logger.info('[Remarketing] Scheduler iniciado — corre cada hora');

  // Correr inmediatamente al arrancar y luego cada hora
  runRemarketingJob().catch((err) =>
    logger.error('[Remarketing] Error en job inicial:', err)
  );

  intervalId = setInterval(() => {
    runRemarketingJob().catch((err) =>
      logger.error('[Remarketing] Error en job programado:', err)
    );
  }, 60 * 60 * 1000); // cada 1 hora
}

export function stopRemarketingScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[Remarketing] Scheduler detenido');
  }
}
