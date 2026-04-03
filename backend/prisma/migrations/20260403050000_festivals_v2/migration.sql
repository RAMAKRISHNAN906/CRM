-- Festivals V2

-- Extend Festival table
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "sendDaysBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "isAutoSend" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "targetAll" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "targetTags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "emoji" TEXT NOT NULL DEFAULT '🎉';

-- FestivalSendLog
CREATE TABLE IF NOT EXISTS "FestivalSendLog" (
  "id"          TEXT NOT NULL,
  "channel"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'sent',
  "messageBody" TEXT NOT NULL,
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "year"        INTEGER NOT NULL,
  "festivalId"  TEXT NOT NULL,
  "contactId"   TEXT NOT NULL,
  CONSTRAINT "FestivalSendLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FestivalSendLog_festivalId_contactId_channel_year_key"
  ON "FestivalSendLog"("festivalId","contactId","channel","year");

CREATE INDEX IF NOT EXISTS "FestivalSendLog_festivalId_idx" ON "FestivalSendLog"("festivalId");
CREATE INDEX IF NOT EXISTS "FestivalSendLog_contactId_idx"  ON "FestivalSendLog"("contactId");
CREATE INDEX IF NOT EXISTS "FestivalSendLog_sentAt_idx"     ON "FestivalSendLog"("sentAt");

ALTER TABLE "FestivalSendLog"
  ADD CONSTRAINT "FestivalSendLog_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed common festivals (skip if already exist)
INSERT INTO "Festival" ("id","name","emoji","date","country","isRecurring","sendDaysBefore","isAutoSend","targetAll","targetTags","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'Diwali','🪔','2025-10-20','IN',true,1,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Eid al-Fitr','🌙','2025-03-30','AE',true,1,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Christmas','🎄','2025-12-25','ALL',true,1,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'New Year','🎆','2026-01-01','ALL',true,0,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Holi','🎨','2025-03-14','IN',true,0,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Eid al-Adha','🐑','2025-06-07','AE',true,1,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Thanksgiving','🦃','2025-11-27','US',true,1,false,true,'[]',NOW(),NOW()),
  (gen_random_uuid(),'Republic Day','🇮🇳','2026-01-26','IN',true,0,false,true,'[]',NOW(),NOW())
ON CONFLICT DO NOTHING;
