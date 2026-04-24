import { prisma } from '../../config/database';

export async function getLeads(
  clientId: string,
  page = 1,
  limit = 20,
  temperature?: string,
  search?: string,
  appointmentBooked?: boolean
) {
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { clientId, isActive: true };

  if (temperature && ['COLD', 'WARM', 'HOT'].includes(temperature)) {
    where.temperature = temperature;
  }

  if (appointmentBooked !== undefined) {
    where.appointmentBooked = appointmentBooked;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { externalId: { contains: search } },
    ];
  }

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
        createdAt: true,
        updatedAt: true,
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            lastMessageAt: true,
            channel: { select: { type: true } },
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total, page, totalPages: Math.ceil(total / limit) };
}

export async function updateLeadTemperature(
  clientId: string,
  leadId: string,
  temperature: 'COLD' | 'WARM' | 'HOT'
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, clientId } });
  if (!lead) throw new Error('Lead no encontrado');

  const prev = lead.temperature;

  await prisma.lead.update({ where: { id: leadId }, data: { temperature } });

  await prisma.temperatureLog.create({
    data: {
      leadId,
      temperature,
      reason: `Cambio manual: era ${prev}, ahora ${temperature}`,
      changedBy: 'agent',
    },
  });

  return { leadId, temperature };
}
