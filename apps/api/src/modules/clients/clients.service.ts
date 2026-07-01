import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Plan } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/middlewares/errorHandler';
import { calculateHealthScore } from '../../shared/utils/healthScore';

interface CreateClientInput {
  name: string;
  slug: string;
  plan: Plan;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export async function listClients() {
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
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        take: 1,
        select: { lastMessageAt: true },
      },
      _count: {
        select: {
          leads: true,
          conversations: true,
        },
      },
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    plan: c.plan,
    isActive: c.isActive,
    createdAt: c.createdAt,
    email: c.users[0]?.email ?? null,
    lastActivityAt: c.conversations[0]?.lastMessageAt ?? null,
    _count: c._count,
  }));
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

  // Token especial de impersonación con expiración corta (1 hora)
  const token = jwt.sign(
    {
      id: clientAdmin.id,
      email: clientAdmin.email,
      name: clientAdmin.name,
      role: clientAdmin.role,
      clientId: client.id,
      impersonatedBy: superadminId,
    },
    env.jwt.secret,
    { expiresIn: '1h' }
  );

  return { accessToken: token, client: { id: client.id, name: client.name } };
}

export async function getGlobalMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalClients,
    activeClients,
    totalLeads,
    totalConversations,
    conversationsToday,
    coldLeads,
    warmLeads,
    hotLeads,
    waitingConversations,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.lead.count(),
    prisma.conversation.count(),
    prisma.conversation.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { temperature: 'COLD', isActive: true } }),
    prisma.lead.count({ where: { temperature: 'WARM', isActive: true } }),
    prisma.lead.count({ where: { temperature: 'HOT', isActive: true } }),
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
  ]);

  const leadsWithoutResponse = waitingConversations.filter(
    (c) => c.messages.length === 0 || c.messages[0].role === 'user'
  ).length;

  const clientsByPlan = await prisma.client.groupBy({
    by: ['plan'],
    _count: true,
  });

  // Score comercial promedio — mismo cálculo del score de salud del panel
  // cliente, promediado entre todos los clientes activos
  const activeClientsData = await prisma.client.findMany({
    where: { isActive: true },
    select: {
      leads: { where: { isActive: true }, select: { temperature: true } },
      conversations: { where: { createdAt: { gte: today } }, select: { id: true } },
    },
  });

  const avgCommercialScore = activeClientsData.length
    ? Math.round(
        activeClientsData.reduce((sum, c) => {
          const total = c.leads.length;
          const hot = c.leads.filter((l) => l.temperature === 'HOT').length;
          const warm = c.leads.filter((l) => l.temperature === 'WARM').length;
          return (
            sum +
            calculateHealthScore({
              hotLeads: hot,
              warmLeads: warm,
              totalLeads: total,
              conversationsToday: c.conversations.length,
            })
          );
        }, 0) / activeClientsData.length
      )
    : 0;

  return {
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,
    totalLeads,
    totalConversations,
    conversationsToday,
    coldLeads,
    warmLeads,
    hotLeads,
    leadsWithoutResponse,
    avgCommercialScore,
    clientsByPlan: clientsByPlan.map((c) => ({ plan: c.plan, count: c._count })),
  };
}
