import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';
import { requestAccess, getStatusForClient, listAccessLogs } from './support-access.service';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPERADMIN'));

const reasonSchema = z.object({ reason: z.string().optional() });

// POST /admin/support-access/clients/:id/request
router.post('/clients/:id/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = reasonSchema.parse(req.body);
    const grant = await requestAccess(req.params.id, req.user!.id, reason);
    res.status(201).json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
});

// GET /admin/support-access/clients/:id/status
router.get('/clients/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getStatusForClient(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /admin/support-access/logs — auditoría de accesos
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await listAccessLogs(page);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
