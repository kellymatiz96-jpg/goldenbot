import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Plan } from '@prisma/client';
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  impersonateClient,
  getGlobalMetrics,
} from './clients.service';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';

const router = Router();

// Todos los endpoints de clientes requieren ser superadmin
router.use(authenticate);
router.use(authorize('SUPERADMIN'));

const createClientSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede tener letras minúsculas, números y guiones'),
  plan: z.nativeEnum(Plan),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  adminName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.nativeEnum(Plan).optional(),
  isActive: z.boolean().optional(),
});

// GET /admin/clients
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await listClients();
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
});

// GET /admin/metrics
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await getGlobalMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// GET /admin/clients/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await getClientById(req.params.id);
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// POST /admin/clients
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createClientSchema.parse(req.body);
    const result = await createClient(input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/clients/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateClientSchema.parse(req.body);
    const client = await updateClient(req.params.id, data);
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// POST /admin/clients/:id/impersonate — acceder al panel del cliente
router.post('/:id/impersonate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await impersonateClient(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
