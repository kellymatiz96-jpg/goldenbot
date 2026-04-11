import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/middlewares/errorHandler';

interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    clientId: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { client: { select: { id: true, name: true, isActive: true } } },
  });

  if (!user) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  if (!user.isActive) {
    throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403);
  }

  // Verificar si el cliente está activo (aplica a CLIENT_ADMIN y AGENT)
  if (user.client && !user.client.isActive) {
    throw new AppError('Tu cuenta está suspendida. Contacta al administrador.', 403);
  }

  // Verificar contraseña
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  // Crear tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
  };

  const accessToken = jwt.sign(tokenPayload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(tokenPayload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  try {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as {
      id: string;
      email: string;
      name: string;
      role: string;
      clientId: string | null;
    };

    // Verificar que el usuario siga existiendo y activo
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      throw new AppError('Usuario no válido', 401);
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, clientId: user.clientId },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken };
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clientId: true,
      createdAt: true,
      client: {
        select: { id: true, name: true, plan: true },
      },
    },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
}
