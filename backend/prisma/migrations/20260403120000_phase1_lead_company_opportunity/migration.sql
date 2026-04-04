-- ── Lead: new fields ─────────────────────────────────────────────────────────
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "country"                     TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "decisionMakerName"           TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "decisionMakerDesignation"    TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "whatsappNumber"              TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedToOpportunityId"    TEXT;

CREATE INDEX IF NOT EXISTS "Lead_country_idx" ON "Lead"("country");

-- ── CompanySettings: extended profile ────────────────────────────────────────
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "address"              TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "city"                 TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "state"                TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "zipCode"              TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "financialYearStart"   TEXT DEFAULT '04';

-- ── OpportunityStage enum: add owner's exact stages ──────────────────────────
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'OPPORTUNITY';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'DEMO';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'FINALISATION';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'ORDER_RELEASE';

-- ── Opportunity: track which lead it came from ───────────────────────────────
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "convertedFromLeadId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "stageEnteredAt"      JSONB DEFAULT '{}';
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "country"             TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "decisionMakerName"   TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "decisionMakerDesignation" TEXT;
