import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../../config/env';

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
}

// Middleware: verifica que el request tenga un JWT válido
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwt.secret) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

// Middleware: verifica que el usuario tenga el rol requerido
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'No tienes permiso para esta acción' });
      return;
    }

    next();
  };
}

// Middleware: verifica que el cliente en la URL coincida con el del usuario autenticado
// (Evita que un cliente acceda a datos de otro cliente)
export function validateClientAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  // El superadmin puede acceder a cualquier cliente
  if (req.user.role === Role.SUPERADMIN) {
    next();
    return;
  }

  // Los demás roles solo pueden acceder a su propio clientId
  const clientIdFromParams = req.params.clientId;
  if (clientIdFromParams && clientIdFromParams !== req.user.clientId) {
    res.status(403).json({ success: false, message: 'Acceso denegado a este cliente' });
    return;
  }

  next();
}
