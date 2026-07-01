import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/middlewares/errorHandler';

export async function listSuperadmins() {
  return prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
}

export async function createSuperadmin(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new AppError('Ya existe un usuario con ese email', 400);
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role: 'SUPERADMIN',
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
}

export async function updateSuperadmin(
  id: string,
  data: Partial<{ name: string; email: string; password: string; isActive: boolean }>
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'SUPERADMIN') {
    throw new AppError('Administrador no encontrado', 404);
  }

  if (data.email && data.email.toLowerCase() !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw new AppError('Ya existe un usuario con ese email', 400);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email.toLowerCase();
  if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 12);

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
}

export async function deleteSuperadmin(id: string, requesterId: string) {
  if (id === requesterId) {
    throw new AppError('No puedes eliminar tu propia cuenta', 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'SUPERADMIN') {
    throw new AppError('Administrador no encontrado', 404);
  }

  const totalSuperadmins = await prisma.user.count({ where: { role: 'SUPERADMIN' } });
  if (totalSuperadmins <= 1) {
    throw new AppError('No puedes eliminar al único super administrador de la plataforma', 400);
  }

  await prisma.user.delete({ where: { id } });
  return { id };
}
