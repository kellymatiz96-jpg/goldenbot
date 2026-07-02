import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { loginUser, refreshAccessToken, getMe, updateProfile, changePassword } from './auth.service';
import { authenticate, blockIfImpersonating } from '../../shared/middlewares/authenticate';

const router = Router();

// Máximo 10 intentos de login por IP cada 15 minutos
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

// POST /auth/login
router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me — retorna el usuario autenticado actual
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /auth/profile — actualizar nombre/email propios (no disponible mientras se impersona)
router.put('/profile', authenticate, blockIfImpersonating, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = profileSchema.parse(req.body);
    const user = await updateProfile(req.user!.id, data);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /auth/password — cambiar la contraseña propia (no disponible mientras se impersona)
router.put('/password', authenticate, blockIfImpersonating, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    const result = await changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
