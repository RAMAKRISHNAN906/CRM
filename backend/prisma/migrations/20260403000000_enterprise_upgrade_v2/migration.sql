-- ============================================================
-- NexusCRM Enterprise Upgrade v2
-- Migration: 2026-04-03
-- Safe for production — all additive, no destructive changes
-- ============================================================

-- 1. PIPELINE STAGES (Dynamic)
CREATE TABLE "PipelineStage" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "order"        INTEGER NOT NULL DEFAULT 0,
    "pipelineType" TEXT NOT NULL DEFAULT 'sales',
    "color"        TEXT NOT NULL DEFAULT '#6366f1',
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PipelineStage_pipelineType_idx" ON "PipelineStage"("pipelineType");
CREATE INDEX "PipelineStage_order_idx" ON "PipelineStage"("order");

-- 2. Add stageId to Deal (nullable, coexists with enum stage for backward compat)
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
CREATE INDEX "Deal_stageId_idx" ON "Deal"("stageId");
ALTER TABLE "Deal"
    ADD CONSTRAINT "Deal_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default pipeline stages from existing DealStage enum deals
INSERT INTO "PipelineStage" ("id", "name", "order", "pipelineType", "color", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Prospecting',     0, 'sales', '#6b7280', NOW()),
  (gen_random_uuid()::text, 'Qualification',   1, 'sales', '#3b82f6', NOW()),
  (gen_random_uuid()::text, 'Needs Analysis',  2, 'sales', '#8b5cf6', NOW()),
  (gen_random_uuid()::text, 'Demo',            3, 'sales', '#6366f1', NOW()),
  (gen_random_uuid()::text, 'Proposal',        4, 'sales', '#f59e0b', NOW()),
  (gen_random_uuid()::text, 'Negotiation',     5, 'sales', '#06b6d4', NOW()),
  (gen_random_uuid()::text, 'Closed Won',      6, 'sales', '#10b981', NOW()),
  (gen_random_uuid()::text, 'Closed Lost',     7, 'sales', '#ef4444', NOW());

-- 3. DEMO DETAILS
CREATE TABLE "DemoDetail" (
    "id"          TEXT NOT NULL,
    "demoDate"    TIMESTAMP(3),
    "meetingLink" TEXT,
    "demoStatus"  TEXT NOT NULL DEFAULT 'Scheduled',
    "demoSummary" TEXT,
    "nextAction"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "dealId"      TEXT NOT NULL,
    CONSTRAINT "DemoDetail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DemoDetail_dealId_key" ON "DemoDetail"("dealId");
ALTER TABLE "DemoDetail"
    ADD CONSTRAINT "DemoDetail_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. COMPANY SETTINGS
CREATE TABLE "CompanySettings" (
    "id"            TEXT NOT NULL,
    "companyName"   TEXT NOT NULL,
    "logoUrl"       TEXT,
    "footerAddress" TEXT,
    "country"       TEXT NOT NULL DEFAULT 'IN',
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "taxNumber"     TEXT,
    "phone"         TEXT,
    "email"         TEXT,
    "website"       TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- 5. PAYMENT TERMS
CREATE TABLE "PaymentTerm" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "content"     TEXT NOT NULL,
    "isDefault"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- Seed default payment terms
INSERT INTO "PaymentTerm" ("id", "name", "content", "isDefault", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Net 30',        'Payment due within 30 days of invoice date.',   true,  NOW()),
  (gen_random_uuid()::text, 'Net 15',        'Payment due within 15 days of invoice date.',   false, NOW()),
  (gen_random_uuid()::text, '50% Advance',   '50% advance payment required before delivery.', false, NOW()),
  (gen_random_uuid()::text, 'Immediate',     'Payment due immediately upon receipt.',          false, NOW());

-- 6. QUOTE TYPE AND STATUS ENUMS
CREATE TYPE "QuoteType" AS ENUM ('SQ', 'SO', 'SI', 'SCR');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- 7. QUOTES
CREATE TABLE "Quote" (
    "id"            TEXT NOT NULL,
    "quoteNumber"   TEXT NOT NULL,
    "type"          "QuoteType" NOT NULL DEFAULT 'SQ',
    "status"        "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "subtotal"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil"    TIMESTAMP(3),
    "notes"         TEXT,
    "termsContent"  TEXT,
    "pdfUrl"        TEXT,
    "country"       TEXT NOT NULL DEFAULT 'IN',
    "financialYear" TEXT,
    "deletedAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "createdById"   TEXT NOT NULL,
    "contactId"     TEXT,
    "dealId"        TEXT,
    "paymentTermId" TEXT,
    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE INDEX "Quote_type_idx"        ON "Quote"("type");
CREATE INDEX "Quote_status_idx"      ON "Quote"("status");
CREATE INDEX "Quote_createdById_idx" ON "Quote"("createdById");
CREATE INDEX "Quote_dealId_idx"      ON "Quote"("dealId");
CREATE INDEX "Quote_deletedAt_idx"   ON "Quote"("deletedAt");
ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Quote_contactId_fkey"   FOREIGN KEY ("contactId")   REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "Quote_dealId_fkey"      FOREIGN KEY ("dealId")      REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "Quote_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. QUOTE LINE ITEMS
CREATE TABLE "QuoteLineItem" (
    "id"          TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity"    DOUBLE PRECISION NOT NULL,
    "unitPrice"   DOUBLE PRECISION NOT NULL,
    "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"       DOUBLE PRECISION NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId"     TEXT NOT NULL,
    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "QuoteLineItem"
    ADD CONSTRAINT "QuoteLineItem_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. PURCHASE ORDER STATUS ENUM
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED');

-- 10. PURCHASE ORDERS
CREATE TABLE "PurchaseOrder" (
    "id"          TEXT NOT NULL,
    "poNumber"    TEXT NOT NULL,
    "status"      "POStatus" NOT NULL DEFAULT 'DRAFT',
    "currency"    TEXT NOT NULL DEFAULT 'INR',
    "subtotal"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "deletedAt"   TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "dealId"      TEXT,
    "invoiceId"   TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
CREATE INDEX "PurchaseOrder_status_idx"    ON "PurchaseOrder"("status");
CREATE INDEX "PurchaseOrder_dealId_idx"    ON "PurchaseOrder"("dealId");
CREATE INDEX "PurchaseOrder_deletedAt_idx" ON "PurchaseOrder"("deletedAt");
ALTER TABLE "PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_dealId_fkey"      FOREIGN KEY ("dealId")      REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "PurchaseOrder_invoiceId_fkey"   FOREIGN KEY ("invoiceId")   REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. PO LINE ITEMS
CREATE TABLE "POLineItem" (
    "id"              TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "quantity"        DOUBLE PRECISION NOT NULL,
    "unitPrice"       DOUBLE PRECISION NOT NULL,
    "total"           DOUBLE PRECISION NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseOrderId" TEXT NOT NULL,
    CONSTRAINT "POLineItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "POLineItem"
    ADD CONSTRAINT "POLineItem_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. LANGUAGES
CREATE TABLE "Language" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");
INSERT INTO "Language" ("id", "code", "name", "direction") VALUES
  (gen_random_uuid()::text, 'en', 'English', 'ltr'),
  (gen_random_uuid()::text, 'ar', 'Arabic',  'rtl'),
  (gen_random_uuid()::text, 'fr', 'French',  'ltr'),
  (gen_random_uuid()::text, 'hi', 'Hindi',   'ltr'),
  (gen_random_uuid()::text, 'ur', 'Urdu',    'rtl');

-- 13. PREFERRED LANGUAGE on User and Contact
ALTER TABLE "User"    ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT DEFAULT 'en';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT DEFAULT 'en';

-- 14. FESTIVALS
CREATE TABLE "Festival" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "date"        TIMESTAMP(3) NOT NULL,
    "country"     TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Festival_country_idx" ON "Festival"("country");
CREATE INDEX "Festival_date_idx"    ON "Festival"("date");

-- 15. FESTIVAL MESSAGES
CREATE TABLE "FestivalMessage" (
    "id"              TEXT NOT NULL,
    "language"        TEXT NOT NULL DEFAULT 'en',
    "messageTemplate" TEXT NOT NULL,
    "channel"         TEXT NOT NULL DEFAULT 'EMAIL',
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "festivalId"      TEXT NOT NULL,
    CONSTRAINT "FestivalMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FestivalMessage_festivalId_idx" ON "FestivalMessage"("festivalId");
ALTER TABLE "FestivalMessage"
    ADD CONSTRAINT "FestivalMessage_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "Festival"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 16. COMPETITORS
CREATE TABLE "Competitor" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "phone"      TEXT,
    "website"    TEXT,
    "strengths"  TEXT,
    "weaknesses" TEXT,
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    "dealId"     TEXT,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Competitor_dealId_idx" ON "Competitor"("dealId");
ALTER TABLE "Competitor"
    ADD CONSTRAINT "Competitor_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. SUBTASKS + completionPct on Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "followUpStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completionPct"  INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "SubTask" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "taskId"      TEXT NOT NULL,
    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubTask_taskId_idx" ON "SubTask"("taskId");
ALTER TABLE "SubTask"
    ADD CONSTRAINT "SubTask_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
