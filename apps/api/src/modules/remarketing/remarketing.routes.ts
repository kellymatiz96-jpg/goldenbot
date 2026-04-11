import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';
import { prisma } from '../../config/database';
import {
  createCampaign,
  getCampaigns,
  toggleCampaign,
  runRemarketingJob,
} from './remarketing.service';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);
router.use(authorize('CLIENT_ADMIN', 'SUPERADMIN'));

const campaignSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  message: z.string().min(1, 'El mensaje es requerido'),
  inactiveDays: z.number().min(1).max(30),
});

// GET /remarketing/campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.clientId!;
    const campaigns = await getCampaigns(clientId);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener campañas' });
  }
});

// POST /remarketing/campaigns
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.clientId!;
    const data = campaignSchema.parse(req.body);
    const campaign = await createCampaign(clientId, data);
    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al crear campaña' });
  }
});

// PUT /remarketing/campaigns/:id/toggle
router.put('/campaigns/:id/toggle', async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.clientId!;
    const { isActive } = req.body;
    const campaign = await toggleCampaign(clientId, req.params.id, isActive);
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar campaña' });
  }
});

// POST /remarketing/run — ejecutar el job manualmente (para pruebas)
router.post('/run', authorize('SUPERADMIN', 'CLIENT_ADMIN'), async (_req: Request, res: Response) => {
  try {
    await runRemarketingJob();
    res.json({ success: true, message: 'Job de remarketing ejecutado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al ejecutar job' });
  }
});

// POST /remarketing/simulate-inactive — para pruebas: marcar conversaciones como inactivas hace 5 días
router.post('/simulate-inactive', async (req: Request, res: Response) => {
  try {
    const clientId = req.user!.clientId!;
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const result = await prisma.conversation.updateMany({
      where: { clientId, status: 'BOT_ACTIVE' },
      data: { lastMessageAt: fiveDaysAgo },
    });

    res.json({
      success: true,
      message: `${result.count} conversaciones marcadas como inactivas hace 5 días`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al simular inactividad' });
  }
});

export default router;
