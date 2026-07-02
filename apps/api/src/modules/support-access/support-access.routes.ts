import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize, blockIfImpersonating } from '../../shared/middlewares/authenticate';
import {
  getStatusForClient,
  clientGrantAccess,
  approveRequest,
  denyRequest,
  revokeAccess,
} from './support-access.service';

const router = Router();

router.use(authenticate);
router.use(authorize('CLIENT_ADMIN'));
// Solo el dueño real de la cuenta puede gestionar su propio acceso de soporte —
// nunca un superadmin impersonando (ver blockIfImpersonating)
router.use(blockIfImpersonating);

const durationSchema = z.object({ durationHours: z.number().refine((v) => [1, 24, 168].includes(v)) });

// GET /client/support-access/status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getStatusForClient(req.user!.clientId!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /client/support-access/grant — el cliente otorga acceso proactivamente
router.post('/grant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { durationHours } = durationSchema.parse(req.body);
    const grant = await clientGrantAccess(req.user!.clientId!, durationHours);
    res.status(201).json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
});

// POST /client/support-access/requests/:grantId/approve
router.post('/requests/:grantId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { durationHours } = durationSchema.parse(req.body);
    const grant = await approveRequest(req.params.grantId, req.user!.clientId!, durationHours);
    res.json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
});

// POST /client/support-access/requests/:grantId/deny
router.post('/requests/:grantId/deny', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grant = await denyRequest(req.params.grantId, req.user!.clientId!);
    res.json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
});

// POST /client/support-access/revoke
router.post('/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grant = await revokeAccess(req.user!.clientId!);
    res.json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
});

export default router;
