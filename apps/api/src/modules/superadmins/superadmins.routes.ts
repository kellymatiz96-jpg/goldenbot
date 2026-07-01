import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../shared/middlewares/authenticate';
import {
  listSuperadmins,
  createSuperadmin,
  updateSuperadmin,
  deleteSuperadmin,
} from './superadmins.service';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPERADMIN'));

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

// GET /admin/superadmins
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const superadmins = await listSuperadmins();
    res.json({ success: true, data: superadmins });
  } catch (err) {
    next(err);
  }
});

// POST /admin/superadmins
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSchema.parse(req.body);
    const superadmin = await createSuperadmin(input);
    res.status(201).json({ success: true, data: superadmin });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/superadmins/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSchema.parse(req.body);
    const superadmin = await updateSuperadmin(req.params.id, data);
    res.json({ success: true, data: superadmin });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/superadmins/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteSuperadmin(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
