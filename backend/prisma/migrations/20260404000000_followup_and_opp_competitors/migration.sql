-- Lead: followUpDate
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpDate" TIMESTAMP(3);

-- Opportunity: followUpDate
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "followUpDate" TIMESTAMP(3);

-- Competitor: opportunityId
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;
CREATE INDEX IF NOT EXISTS "Competitor_opportunityId_idx" ON "Competitor"("opportunityId");
