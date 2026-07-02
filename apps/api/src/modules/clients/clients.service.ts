import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Plan } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/middlewares/errorHandler';
import { calculateHealthScore } from '../../shared/utils/healthScore';
import { getActiveGrant, logAccess } from '../support-access/support-access.service';

interface CreateClientInput {
  name: string;
  slug: string;
  plan: Plan;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export async function listClients() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
      createdAt: true,
      users: {
        where: { role: 'CLIENT_ADMIN' },
        take: 1,
        select: { email: true },
      },
      channels: { select: { type: true, isActive: true } },
      aiConfig: { select: { id: true } },
      _count: {
        select: { leads: true, conversations: true },
      },
    },
  });

  return Promise.all(
    clients.map(async (c) => {
      const [
        leadsThisMonth,
        conversationsThisMonth,
        hotLeads,
        warmLeads,
        totalActiveLeads,
        conversationsToday,
        waitingConversations,
        lastGrant,
      ] = await Promise.all([
        prisma.lead.count({ where: { clientId: c.id, createdAt: { gte: startOfMonth } } }),
        prisma.conversation.count({ where: { clientId: c.id, createdAt: { gte: startOfMonth } } }),
        prisma.lead.count({ where: { clientId: c.id, temperature: 'HOT', isActive: true } }),
        prisma.lead.count({ where: { clientId: c.id, temperature: 'WARM', isActive: true } }),
        prisma.lead.count({ where: { clientId: c.id, isActive: true } }),
        prisma.conversation.count({ where: { clientId: c.id, createdAt: { gte: today } } }),
        prisma.conversation.findMany({
          where: { clientId: c.id, status: 'AGENT_ACTIVE' },
          select: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { role: true } } },
        }),
        prisma.supportAccessGrant.findFirst({
          where: { clientId: c.id },
          orderBy: { createdAt: 'desc' },
          select: { status: true, expiresAt: true, initiatedBy: true },
        }),
      ]);

      const unansweredCount = waitingConversations.filter(
        (conv) => conv.messages.length === 0 || conv.messages[0].role === 'user'
      ).length;

      const commercialScore = calculateHealthScore({
        hotLeads,
        warmLeads,
        totalLeads: totalActiveLeads,
        conversationsToday,
      });

      let supportStatus: 'NONE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'DENIED' | 'REVOKED' = 'NONE';
      if (lastGrant) {
        if (lastGrant.status === 'ACTIVE' && lastGrant.expiresAt && lastGrant.expiresAt > new Date()) {
          supportStatus = 'ACTIVE';
        } else if (lastGrant.status === 'ACTIVE') {
          supportStatus = 'EXPIRED';
        } else {
          supportStatus = lastGrant.status;
        }
      }

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        plan: c.plan,
        isActive: c.isActive,
        createdAt: c.createdAt,
        email: c.users[0]?.email ?? null,
        botActive: c.isActive && !!c.aiConfig,
        widgetActive: c.channels.find((ch) => ch.type === 'WEBCHAT')?.isActive ?? false,
        whatsappActive: c.channels.find((ch) => ch.type === 'WHATSAPP')?.isActive ?? false,
        leadsThisMonth,
        conversationsThisMonth,
        unansweredCount,
        commercialScore,
        supportStatus,
        _count: c._count,
      };
    })
  );
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: { in: ['CLIENT_ADMIN', 'AGENT'] } },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
      businessInfo: true,
      channels: true,
      aiConfig: true,
      _count: {
        select: { leads: true, conversations: true },
      },
    },
  });

  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  return client;
}

export async function createClient(input: CreateClientInput) {
  // Verificar que el slug no exista
  const existingSlug = await prisma.client.findUnique({ where: { slug: input.slug } });
  if (existingSlug) {
    throw new AppError('El identificador (slug) ya está en uso', 400);
  }

  // Verificar que el email del admin no exista
  const existingUser = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (existingUser) {
    throw new AppError('Ya existe un usuario con ese email', 400);
  }

  const hashedPassword = await bcrypt.hash(input.adminPassword, 12);

  // Límite de conversaciones según plan
  const maxConversations = {
    BASIC: 500,
    PROFESSIONAL: 2000,
    PREMIUM: 999999,
  }[input.plan];

  // Crear cliente + admin + configuración de IA en una transacción
  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        maxConversationsPerMonth: maxConversations,
      },
    });

    const admin = await tx.user.create({
      data: {
        email: input.adminEmail.toLowerCase(),
        password: hashedPassword,
        name: input.adminName,
        role: 'CLIENT_ADMIN',
        clientId: client.id,
        mustChangePassword: true,
      },
    });

    // Crear configuración de IA según el plan
    await tx.aIConfig.create({
      data: {
        clientId: client.id,
        chatbotProvider: input.plan === 'BASIC' ? 'OPENAI' : 'ANTHROPIC',
        chatbotModel: input.plan === 'BASIC' ? 'gpt-4o-mini' : 'claude-haiku-20240307',
      },
    });

    return { client, admin };
  });

  return {
    client: result.client,
    admin: {
      id: result.admin.id,
      email: result.admin.email,
      name: result.admin.name,
    },
  };
}

export async function updateClient(
  id: string,
  data: Partial<{ name: string; plan: Plan; isActive: boolean }>
) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  return prisma.client.update({
    where: { id },
    data,
  });
}

// Genera un token de acceso temporal para que el superadmin acceda al panel del cliente
export async function impersonateClient(clientId: string, superadminId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: { where: { role: 'CLIENT_ADMIN' }, take: 1 },
    },
  });

  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  if (client.users.length === 0) {
    throw new AppError('Este cliente no tiene un administrador configurado', 400);
  }

  const clientAdmin = client.users[0];

  // Decide el modo del lado del servidor — nunca confía en qué botón usó el frontend.
  // Solo hay acceso completo si el cliente autorizó un acceso de soporte vigente.
  const activeGrant = await getActiveGrant(clientId);
  const supportMode: 'LIMITED' | 'SUPPORT' = activeGrant ? 'SUPPORT' : 'LIMITED';

  // El token nunca dura más de 1 hora, y si hay un grant activo, tampoco más de lo que le quede
  let expiresInSeconds = 60 * 60;
  if (activeGrant?.expiresAt) {
    const remainingSeconds = Math.floor((activeGrant.expiresAt.getTime() - Date.now()) / 1000);
    expiresInSeconds = Math.max(60, Math.min(expiresInSeconds, remainingSeconds));
  }

  const token = jwt.sign(
    {
      id: clientAdmin.id,
      email: clientAdmin.email,
      name: clientAdmin.name,
      role: clientAdmin.role,
      clientId: client.id,
      impersonatedBy: superadminId,
      supportMode,
    },
    env.jwt.secret,
    { expiresIn: expiresInSeconds }
  );

  await logAccess(clientId, superadminId, supportMode, activeGrant?.id);

  return { accessToken: token, client: { id: client.id, name: client.name }, supportMode };
}

export async function getGlobalMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalClients,
    activeClients,
    activeBots,
    conversationsToday,
    leadsThisMonth,
    widgetsInstalled,
    whatsappConnected,
    pendingSupportRequests,
    activeSupportAccess,
    waitingConversations,
    clientsByPlan,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count({ where: { isActive: true, aiConfig: { isNot: null } } }),
    prisma.conversation.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.channel.count({ where: { type: 'WEBCHAT', isActive: true } }),
    prisma.channel.count({ where: { type: 'WHATSAPP', isActive: true } }),
    prisma.supportAccessGrant.count({ where: { status: 'PENDING' } }),
    prisma.supportAccessGrant.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    // Conversaciones con agente activo — se revisa el último mensaje de cada una
    // para saber si el lead está esperando respuesta (mismo criterio que el
    // badge "esperando agente" del panel del cliente)
    prisma.conversation.findMany({
      where: { status: 'AGENT_ACTIVE' },
      select: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { role: true },
        },
      },
    }),
    prisma.client.groupBy({ by: ['plan'], _count: true }),
  ]);

  const leadsWithoutResponse = waitingConversations.filter(
    (c) => c.messages.length === 0 || c.messages[0].role === 'user'
  ).length;

  return {
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,
    activeBots,
    conversationsToday,
    leadsThisMonth,
    leadsWithoutResponse,
    widgetsInstalled,
    whatsappConnected,
    pendingSupportRequests,
    activeSupportAccess,
    clientsByPlan: clientsByPlan.map((c) => ({ plan: c.plan, count: c._count })),
  };
}
