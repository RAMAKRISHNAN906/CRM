-- Activities V2: Meeting fields on Communication
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "activityStatus" TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "meetingSummary" TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;

CREATE INDEX IF NOT EXISTS "Communication_scheduledAt_idx" ON "Communication"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Communication_activityStatus_idx" ON "Communication"("activityStatus");
CREATE INDEX IF NOT EXISTS "Communication_channel_idx" ON "Communication"("channel");
