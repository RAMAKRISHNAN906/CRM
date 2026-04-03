-- Global customer list shared across all festivals
CREATE TABLE "FestivalCustomer" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "phone"     TEXT,
  "email"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FestivalCustomer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FestivalCustomer_email_idx" ON "FestivalCustomer"("email");

-- Migrate existing FestivalRecipient rows into the global table
INSERT INTO "FestivalCustomer" ("id", "name", "phone", "email", "createdAt", "updatedAt")
SELECT DISTINCT ON ("name", COALESCE("phone",''), COALESCE("email",''))
  "id", "name", "phone", "email", "createdAt", "createdAt"
FROM "FestivalRecipient";

-- Also add a customMessage column to Festival for per-send ephemeral storage
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "customMessage" TEXT;
