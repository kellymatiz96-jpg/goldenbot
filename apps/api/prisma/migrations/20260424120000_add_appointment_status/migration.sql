ALTER TABLE "leads" ADD COLUMN "appointmentStatus" TEXT;
UPDATE "leads" SET "appointmentStatus" = 'PENDING' WHERE "appointmentBooked" = true;
