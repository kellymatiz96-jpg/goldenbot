import { prisma } from '../../config/database';

export async function getGlobalConversations(page = 1, limit = 30) {
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true, externalId: true } },
        channel: { select: { type: true } },
      },
    }),
    prisma.conversation.count(),
  ]);

  return { conversations, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getGlobalLeads(page = 1, limit = 30, temperature?: string) {
  const skip = (page - 1) * limit;
  const where = temperature && ['COLD', 'WARM', 'HOT'].includes(temperature)
    ? { temperature: temperature as 'COLD' | 'WARM' | 'HOT' }
    : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        externalId: true,
        source: true,
        temperature: true,
        appointmentBooked: true,
        appointmentStatus: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getGlobalAgents() {
  return prisma.user.findMany({
    where: { role: { in: ['CLIENT_ADMIN', 'AGENT'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      client: { select: { id: true, name: true } },
    },
  });
}

export async function getIntegrationsOverview() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      channels: { select: { type: true, isActive: true } },
    },
  });

  return clients.map((c) => {
    const byType = (type: string) => c.channels.find((ch) => ch.type === type)?.isActive ?? false;
    return {
      id: c.id,
      name: c.name,
      whatsapp: byType('WHATSAPP'),
      instagram: byType('INSTAGRAM'),
      webchat: byType('WEBCHAT'),
    };
  });
}
