-- Fecha y notas de cita en leads
ALTER TABLE "leads" ADD COLUMN "appointmentBookedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "appointmentNotes" TEXT;
