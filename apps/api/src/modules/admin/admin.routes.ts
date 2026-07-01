import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';
import {
  getGlobalConversations,
  getGlobalLeads,
  getGlobalAgents,
  getIntegrationsOverview,
} from './admin.service';

const router = Router();

// Todos los endpoints de supervisión global requieren ser superadmin
router.use(authenticate);
router.use(authorize('SUPERADMIN'));

// GET /admin/overview/conversations — conversaciones de todos los clientes
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await getGlobalConversations(page, 30);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /admin/overview/leads — leads de todos los clientes
router.get('/leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const temperature = req.query.temperature as string | undefined;
    const result = await getGlobalLeads(page, 30, temperature);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /admin/overview/agents — usuarios (admins/agentes) de todos los clientes
router.get('/agents', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await getGlobalAgents();
    res.json({ success: true, data: agents });
  } catch (err) {
    next(err);
  }
});

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
