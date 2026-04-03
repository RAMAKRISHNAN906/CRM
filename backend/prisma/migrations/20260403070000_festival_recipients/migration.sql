-- Add scheduled direct-send fields to Festival
ALTER TABLE "Festival" ADD COLUMN "scheduledAt"     TIMESTAMP(3);
ALTER TABLE "Festival" ADD COLUMN "whatsappMessage" TEXT;
ALTER TABLE "Festival" ADD COLUMN "emailSubject"    TEXT;
ALTER TABLE "Festival" ADD COLUMN "emailMessage"    TEXT;
ALTER TABLE "Festival" ADD COLUMN "isSent"          BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Festival_scheduledAt_idx" ON "Festival"("scheduledAt");

-- FestivalRecipient table
CREATE TABLE "FestivalRecipient" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "phone"           TEXT,
  "email"           TEXT,
  "emailStatus"     TEXT NOT NULL DEFAULT 'pending',
  "whatsappStatus"  TEXT NOT NULL DEFAULT 'pending',
  "emailError"      TEXT,
  "whatsappError"   TEXT,
  "sentAt"          TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "festivalId"      TEXT NOT NULL,
  CONSTRAINT "FestivalRecipient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FestivalRecipient"
  ADD CONSTRAINT "FestivalRecipient_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "Festival"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "FestivalRecipient_festivalId_idx" ON "FestivalRecipient"("festivalId");
