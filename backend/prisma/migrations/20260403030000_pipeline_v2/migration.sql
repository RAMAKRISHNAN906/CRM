-- Pipeline V2: Stage tracking, duration, transitions, funnel

-- 1. Extend PipelineStage with metadata
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "defaultProbability" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "isWon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "isLost" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "expectedDays" INTEGER;

-- 2. Add stageEnteredAt to Deal
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "stageEnteredAt" TIMESTAMP(3);

-- 3. Create PipelineDealTransition
CREATE TABLE IF NOT EXISTS "PipelineDealTransition" (
  "id"            TEXT NOT NULL,
  "enteredAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exitedAt"      TIMESTAMP(3),
  "durationHours" DOUBLE PRECISION,
  "dealId"        TEXT NOT NULL,
  "fromStageId"   TEXT,
  "toStageId"     TEXT NOT NULL,
  "changedById"   TEXT,
  CONSTRAINT "PipelineDealTransition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PipelineDealTransition_dealId_idx"    ON "PipelineDealTransition"("dealId");
CREATE INDEX IF NOT EXISTS "PipelineDealTransition_toStageId_idx" ON "PipelineDealTransition"("toStageId");
CREATE INDEX IF NOT EXISTS "PipelineDealTransition_enteredAt_idx" ON "PipelineDealTransition"("enteredAt");

ALTER TABLE "PipelineDealTransition"
  ADD CONSTRAINT "PipelineDealTransition_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PipelineDealTransition"
  ADD CONSTRAINT "PipelineDealTransition_fromStageId_fkey"
  FOREIGN KEY ("fromStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PipelineDealTransition"
  ADD CONSTRAINT "PipelineDealTransition_toStageId_fkey"
  FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PipelineDealTransition"
  ADD CONSTRAINT "PipelineDealTransition_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Seed default sales pipeline stages (only if none exist)
INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Lead',1,'sales','#64748b',true,10,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Lead');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Opportunity',2,'sales','#3b82f6',true,20,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Opportunity');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Demo',3,'sales','#8b5cf6',true,35,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Demo');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Proposal',4,'sales','#f59e0b',true,50,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Proposal');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Negotiation',5,'sales','#f97316',true,70,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Negotiation');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'PO Received',6,'sales','#06b6d4',true,85,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='PO Received');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Sales Order',7,'sales','#10b981',true,95,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Sales Order');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","createdAt","updatedAt")
SELECT gen_random_uuid(),'Invoice Sent',8,'sales','#22c55e',true,98,false,false,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Invoice Sent');

INSERT INTO "PipelineStage" ("id","name","order","pipelineType","color","isActive","defaultProbability","isWon","isLost","expectedDays","createdAt","updatedAt")
SELECT gen_random_uuid(),'Completed',9,'sales','#16a34a',true,100,true,false,NULL,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" WHERE "pipelineType"='sales' AND "name"='Completed');
