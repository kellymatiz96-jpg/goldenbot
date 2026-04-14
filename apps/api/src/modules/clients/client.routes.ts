import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../shared/middlewares/authenticate';
import { prisma } from '../../config/database';
import {
  getBusinessInfo,
  upsertBusinessInfo,
  getAgents,
  createAgent,
  updateAgent,
} from './businessInfo.service';

const router = Router();

router.use(authenticate);

// ---- INFORMACIÓN DEL NEGOCIO ----

const businessInfoSchema = z.object({
  businessName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  services: z.string().optional(),
  prices: z.string().optional(),
  schedule: z.string().optional(),
  location: z.string().optional(),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
  welcomeMessage: z.string().optional(),
  humanKeywords: z.array(z.string()).optional(),
  extraInfo: z.string().optional(),
  conversionGoal: z.string().optional(),
});

// GET /client/me — devuelve el slug del cliente actual
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.user!.clientId! },
      select: { id: true, slug: true, name: true },
    });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// GET /client/business-info
router.get('/business-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await getBusinessInfo(req.user!.clientId!);
    res.json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
});

// PUT /client/business-info
router.put('/business-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = businessInfoSchema.parse(req.body);
    const info = await upsertBusinessInfo(req.user!.clientId!, input);
    res.json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
});

// ---- AGENTES HUMANOS ----

const createAgentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

// GET /client/agents
router.get('/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await getAgents(req.user!.clientId!);
    res.json({ success: true, data: agents });
  } catch (err) {
    next(err);
  }
});

// POST /client/agents
router.post('/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createAgentSchema.parse(req.body);
    const agent = await createAgent(req.user!.clientId!, input);
    res.status(201).json({ success: true, data: agent });
  } catch (err) {
    next(err);
  }
});

// PUT /client/agents/:id
router.put('/agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateAgentSchema.parse(req.body);
    const agent = await updateAgent(req.user!.clientId!, req.params.id, input);
    res.json({ success: true, data: agent });
  } catch (err) {
    next(err);
  }
});

export default router;
