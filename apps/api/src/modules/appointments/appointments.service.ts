import { prisma } from '../../config/database';
import { getIO } from '../../config/socket';
import { AppError } from '../../shared/middlewares/errorHandler';
import { logger } from '../../shared/utils/logger';

export async function getAppointments(clientId: string) {
  return prisma.appointment.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { id: true, name: true, phone: true, externalId: true } },
      conversation: { select: { id: true, channel: { select: { type: true } } } },
    },
  });
}

export async function confirmAppointment(clientId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.clientId !== clientId) {
    throw new AppError('Cita no encontrada', 404);
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CONFIRMED' },
  });
}

export async function cancelAppointment(clientId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.clientId !== clientId) {
    throw new AppError('Cita no encontrada', 404);
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED' },
  });
}

export async function updateAppointmentNotes(clientId: string, appointmentId: string, notes: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.clientId !== clientId) {
    throw new AppError('Cita no encontrada', 404);
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { notes },
  });
}

// Llamado desde chatbot.service.ts — intenta extraer datos de cita de la conversación
export async function tryExtractAppointment(
  clientId: string,
  leadId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  aiClassify: (prompt: string) => Promise<string>
) {
  // Evitar duplicados: si ya hay una cita activa para esta conversación, no crear otra
  const existing = await prisma.appointment.findFirst({
    where: { conversationId, status: { not: 'CANCELLED' } },
  });
  if (existing) return;

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`)
    .join('\n');

  const prompt = `Analiza esta conversación de un chatbot de atención al cliente.
Determina si el cliente ya proporcionó suficientes datos para registrar una cita o reserva.

Datos mínimos necesarios: al menos el servicio deseado Y una fecha o día mencionado.
El nombre puede inferirse del lead si no lo dice explícitamente.

Conversación:
${conversationText}

Si hay suficientes datos para registrar una cita, responde con este JSON exacto:
{"complete":true,"patientName":"nombre o null","service":"servicio solicitado","appointmentDate":"fecha mencionada","appointmentTime":"hora mencionada o null","notes":"cualquier detalle adicional o null"}

Si NO hay suficientes datos todavía, responde exactamente:
{"complete":false}

Responde SOLO con el JSON, sin texto adicional.`;

  try {
    const raw = await aiClassify(prompt);
    const parsed = JSON.parse(raw.trim());

    if (!parsed.complete) return;

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        leadId,
        conversationId,
        status: 'PENDING',
        patientName: parsed.patientName || null,
        service: parsed.service || null,
        appointmentDate: parsed.appointmentDate || null,
        appointmentTime: parsed.appointmentTime || null,
        notes: parsed.notes || null,
      },
    });

    // Notificar al panel en tiempo real
    try {
      getIO().to(`client:${clientId}`).emit('appointment:new', {
        appointmentId: appointment.id,
        conversationId,
        patientName: appointment.patientName,
        service: appointment.service,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
      });
    } catch { /* ignorar si socket no disponible */ }

    logger.info(`[Citas] Nueva cita registrada: ${appointment.id} para conversación ${conversationId}`);
  } catch (err) {
    logger.warn('[Citas] No se pudo extraer cita de la conversación:', err);
  }
}
