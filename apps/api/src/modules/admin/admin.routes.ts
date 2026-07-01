import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';
import { getIntegrationsOverview } from './admin.service';

const router = Router();

// Todos los endpoints de supervisión global requieren ser superadmin
router.use(authenticate);
router.use(authorize('SUPERADMIN'));

// GET /admin/overview/integrations — estado de canales por cliente
router.get('/integrations', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const integrations = await getIntegrationsOverview();
    res.json({ success: true, data: integrations });
  } catch (err) {
    next(err);
  }
});

export default router;
