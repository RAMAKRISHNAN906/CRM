-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM (
  'PROSPECTING','QUALIFICATION','NEEDS_ANALYSIS','VALUE_PROPOSITION',
  'DECISION_MAKERS','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'
);

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM (
  'NEW_BUSINESS','EXISTING_BUSINESS','RENEWAL','UPGRADE'
);

-- CreateTable
CREATE TABLE "Opportunity" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "stage"       "OpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
  "type"        "OpportunityType"  NOT NULL DEFAULT 'NEW_BUSINESS',
  "priority"    TEXT NOT NULL DEFAULT 'MEDIUM',
  "value"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"    TEXT NOT NULL DEFAULT 'USD',
  "probability" INTEGER NOT NULL DEFAULT 10,
  "closeDate"   TIMESTAMP(3),
  "source"      TEXT,
  "tags"        TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes"       TEXT,
  "lostReason"  TEXT,
  "deletedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId"     TEXT NOT NULL,
  "assigneeId"  TEXT,
  "contactId"   TEXT,
  "accountId"   TEXT,

  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "Opportunity_stage_idx"      ON "Opportunity"("stage");
CREATE INDEX "Opportunity_ownerId_idx"    ON "Opportunity"("ownerId");
CREATE INDEX "Opportunity_assigneeId_idx" ON "Opportunity"("assigneeId");
CREATE INDEX "Opportunity_contactId_idx"  ON "Opportunity"("contactId");
CREATE INDEX "Opportunity_deletedAt_idx"  ON "Opportunity"("deletedAt");
CREATE INDEX "Opportunity_closeDate_idx"  ON "Opportunity"("closeDate");

-- AddForeignKeys
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
