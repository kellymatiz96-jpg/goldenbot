import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { saveSubscription, deleteSubscription } from './notifications.service';

const router = Router();

router.use(authenticate);

// GET /notifications/vapid-key — devuelve la clave pública VAPID al frontend
router.get('/vapid-key', (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ success: true, data: { publicKey } });
});

// POST /notifications/subscribe — guarda la suscripción push del agente
router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ success: false, message: 'Suscripción inválida' });
      return;
    }
    await saveSubscription(req.user!.id, { endpoint, keys });
    res.json({ success: true, message: 'Suscripción guardada' });
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications/subscribe — elimina la suscripción push
router.delete('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await deleteSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
