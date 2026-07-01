import { prisma } from '../../config/database';

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
