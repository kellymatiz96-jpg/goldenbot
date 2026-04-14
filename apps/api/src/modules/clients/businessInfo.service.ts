import { prisma } from '../../config/database';
import { AppError } from '../../shared/middlewares/errorHandler';

interface BusinessInfoInput {
  businessName: string;
  description?: string;
  services?: string;
  prices?: string;
  schedule?: string;
  location?: string;
  faq?: Array<{ question: string; answer: string }>;
  welcomeMessage?: string;
  humanKeywords?: string[];
  extraInfo?: string;
  conversionGoal?: string;
}

export async function getBusinessInfo(clientId: string) {
  const info = await prisma.businessInfo.findUnique({
    where: { clientId },
  });
  return info;
}

export async function upsertBusinessInfo(clientId: string, input: BusinessInfoInput) {
  return prisma.businessInfo.upsert({
    where: { clientId },
    create: { clientId, ...input },
    update: input,
  });
}

export async function getAgents(clientId: string) {
  return prisma.user.findMany({
    where: { clientId, role: { in: ['CLIENT_ADMIN', 'AGENT'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAgent(
  clientId: string,
  input: { name: string; email: string; password: string }
) {
  const bcrypt = await import('bcryptjs');

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Ya existe un usuario con ese email', 400);
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role: 'AGENT',
      clientId,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function updateAgent(
  clientId: string,
  agentId: string,
  input: { name?: string; isActive?: boolean }
) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });

  if (!agent || agent.clientId !== clientId) {
    throw new AppError('Agente no encontrado', 404);
  }

  return prisma.user.update({
    where: { id: agentId },
    data: input,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}
