import { prisma } from '../../config/database';
import { AppError } from '../../shared/middlewares/errorHandler';

const VALID_DURATIONS = [1, 24, 168]; // 1h, 24h, 7 días

function computeDisplayStatus(grant: { status: string; expiresAt: Date | null } | null) {
  if (!grant) return 'NONE';
  if (grant.status === 'ACTIVE' && grant.expiresAt && grant.expiresAt > new Date()) return 'ACTIVE';
  if (grant.status === 'ACTIVE') return 'EXPIRED';
  return grant.status; // PENDING | DENIED | REVOKED
}

// Grant vigente (activo, no vencido) para un cliente
export async function getActiveGrant(clientId: string) {
  const grant = await prisma.supportAccessGrant.findFirst({
    where: { clientId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return grant;
}

// Último grant relevante (para mostrar estado en la tabla de clientes / settings)
export async function getStatusForClient(clientId: string) {
  const grant = await prisma.supportAccessGrant.findFirst({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
  return { grant, displayStatus: computeDisplayStatus(grant) };
}

// El superadmin solicita acceso — crea una solicitud pendiente
export async function requestAccess(clientId: string, adminId: string, reason?: string) {
  const existing = await prisma.supportAccessGrant.findFirst({
    where: { clientId, status: { in: ['PENDING', 'ACTIVE'] } },
  });
  if (existing && computeDisplayStatus(existing) !== 'EXPIRED') {
    throw new AppError('Ya hay una solicitud o acceso vigente para este cliente', 400);
  }

  return prisma.supportAccessGrant.create({
    data: {
      clientId,
      status: 'PENDING',
      initiatedBy: 'ADMIN',
      requestedByAdminId: adminId,
      reason,
    },
  });
}

// El cliente otorga acceso proactivamente (sin que el admin lo haya pedido)
export async function clientGrantAccess(clientId: string, durationHours: number) {
  if (!VALID_DURATIONS.includes(durationHours)) {
    throw new AppError('Duración inválida', 400);
  }

  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return prisma.supportAccessGrant.create({
    data: {
      clientId,
      status: 'ACTIVE',
      initiatedBy: 'CLIENT',
      durationHours,
      expiresAt,
      respondedAt: new Date(),
    },
  });
}

// El cliente aprueba una solicitud pendiente del admin
export async function approveRequest(grantId: string, clientId: string, durationHours: number) {
  if (!VALID_DURATIONS.includes(durationHours)) {
    throw new AppError('Duración inválida', 400);
  }

  const grant = await prisma.supportAccessGrant.findFirst({ where: { id: grantId, clientId } });
  if (!grant || grant.status !== 'PENDING') {
    throw new AppError('Solicitud no encontrada o ya respondida', 404);
  }

  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return prisma.supportAccessGrant.update({
    where: { id: grantId },
    data: { status: 'ACTIVE', durationHours, expiresAt, respondedAt: new Date() },
  });
}

// El cliente rechaza una solicitud pendiente del admin
export async function denyRequest(grantId: string, clientId: string) {
  const grant = await prisma.supportAccessGrant.findFirst({ where: { id: grantId, clientId } });
  if (!grant || grant.status !== 'PENDING') {
    throw new AppError('Solicitud no encontrada o ya respondida', 404);
  }

  return prisma.supportAccessGrant.update({
    where: { id: grantId },
    data: { status: 'DENIED', respondedAt: new Date() },
  });
}

// El cliente revoca un acceso activo antes de que expire
export async function revokeAccess(clientId: string) {
  const grant = await getActiveGrant(clientId);
  if (!grant) {
    throw new AppError('No hay ningún acceso activo para revocar', 400);
  }

  return prisma.supportAccessGrant.update({
    where: { id: grant.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
}

// Registra cada vez que el superadmin entra a la cuenta de un cliente
export async function logAccess(clientId: string, adminId: string, mode: 'LIMITED' | 'SUPPORT', grantId?: string) {
  return prisma.adminAccessLog.create({
    data: { clientId, adminId, mode, grantId },
  });
}

export async function listAccessLogs(page = 1, limit = 30) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.adminAccessLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        mode: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true, email: true } },
        grant: { select: { reason: true, initiatedBy: true } },
      },
    }),
    prisma.adminAccessLog.count(),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}
