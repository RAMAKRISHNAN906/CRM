-- ============================================================
-- NexusCRM Enterprise Upgrade Migration
-- Safely renames userId → ownerId and adds all new tables
-- ============================================================

-- ============================================================
-- STEP 1: Add new enum values
-- ============================================================
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES_REP';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'DISQUALIFIED';
ALTER TYPE "DealStage" ADD VALUE IF NOT EXISTS 'NEEDS_ANALYSIS';
ALTER TYPE "DealStage" ADD VALUE IF NOT EXISTS 'VALUE_PROPOSITION';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'PAID_AD';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'ORGANIC_SEARCH';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'PARTNER';

-- ============================================================
-- STEP 2: New enum types
-- ============================================================
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'MEETING', 'NOTE');
CREATE TYPE "AutomationTrigger" AS ENUM ('LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'DEAL_STAGE_CHANGED', 'DEAL_CREATED', 'TASK_OVERDUE', 'TICKET_CREATED', 'CONTACT_CREATED', 'SCHEDULED');
CREATE TYPE "AutomationAction" AS ENUM ('SEND_EMAIL', 'CREATE_TASK', 'ASSIGN_TO_USER', 'UPDATE_FIELD', 'SEND_WEBHOOK', 'SEND_SMS', 'CREATE_NOTIFICATION');
CREATE TYPE "NotificationType" AS ENUM ('TASK_DUE', 'LEAD_ASSIGNED', 'DEAL_WON', 'DEAL_LOST', 'TICKET_ASSIGNED', 'MENTION', 'SYSTEM', 'AUTOMATION');
CREATE TYPE "DocumentType" AS ENUM ('CONTRACT', 'INVOICE', 'PROPOSAL', 'OTHER');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- ============================================================
-- STEP 3: New columns on User
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customPermissions" JSONB;

-- ============================================================
-- STEP 4: Team table
-- ============================================================
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 5: RolePermission table
-- ============================================================
CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_role_resource_action_key" ON "RolePermission"("role", "resource", "action");

-- ============================================================
-- STEP 6: Account table
-- ============================================================
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "revenue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "website" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "linkedin" TEXT,
    "description" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Account_name_idx" ON "Account"("name");
CREATE INDEX IF NOT EXISTS "Account_domain_idx" ON "Account"("domain");

-- ============================================================
-- STEP 7: Migrate Lead: userId → ownerId
-- ============================================================
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Lead" SET "ownerId" = "userId" WHERE "ownerId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "duplicateOfId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedToContactId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Drop old userId column on Lead
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "userId";

CREATE INDEX IF NOT EXISTS "Lead_ownerId_idx" ON "Lead"("ownerId");
CREATE INDEX IF NOT EXISTS "Lead_assigneeId_idx" ON "Lead"("assigneeId");
CREATE INDEX IF NOT EXISTS "Lead_score_idx" ON "Lead"("score");
CREATE INDEX IF NOT EXISTS "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- ============================================================
-- STEP 8: LeadScoreHistory table
-- ============================================================
CREATE TABLE IF NOT EXISTS "LeadScoreHistory" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    CONSTRAINT "LeadScoreHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeadScoreHistory_leadId_idx" ON "LeadScoreHistory"("leadId");

-- ============================================================
-- STEP 9: Migrate Contact: userId → ownerId
-- ============================================================
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Contact" SET "ownerId" = "userId" WHERE "ownerId" IS NULL;
ALTER TABLE "Contact" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Contact" DROP COLUMN IF EXISTS "userId";

CREATE INDEX IF NOT EXISTS "Contact_ownerId_idx" ON "Contact"("ownerId");
CREATE INDEX IF NOT EXISTS "Contact_accountId_idx" ON "Contact"("accountId");

-- ============================================================
-- STEP 10: Migrate Deal: userId → ownerId
-- ============================================================
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Deal" SET "ownerId" = "userId" WHERE "ownerId" IS NULL;
ALTER TABLE "Deal" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Deal" DROP COLUMN IF EXISTS "userId";

CREATE INDEX IF NOT EXISTS "Deal_ownerId_idx" ON "Deal"("ownerId");
CREATE INDEX IF NOT EXISTS "Deal_assigneeId_idx" ON "Deal"("assigneeId");

-- ============================================================
-- STEP 11: DealStageHistory table
-- ============================================================
CREATE TABLE IF NOT EXISTS "DealStageHistory" (
    "id" TEXT NOT NULL,
    "fromStage" "DealStage",
    "toStage" "DealStage" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "dealId" TEXT NOT NULL,
    CONSTRAINT "DealStageHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DealStageHistory_dealId_idx" ON "DealStageHistory"("dealId");

-- ============================================================
-- STEP 12: Migrate Task: userId → ownerId
-- ============================================================
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Task" SET "ownerId" = "userId" WHERE "ownerId" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reminderAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Task" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "relatedType";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "relatedId";

CREATE INDEX IF NOT EXISTS "Task_ownerId_idx" ON "Task"("ownerId");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task"("assigneeId");

-- ============================================================
-- STEP 13: Communication table
-- ============================================================
CREATE TABLE IF NOT EXISTS "Communication" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "ticketId" TEXT,
    "threadId" TEXT,
    "parentMessageId" TEXT,
    "externalId" TEXT,
    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Communication_userId_idx" ON "Communication"("userId");
CREATE INDEX IF NOT EXISTS "Communication_leadId_idx" ON "Communication"("leadId");
CREATE INDEX IF NOT EXISTS "Communication_contactId_idx" ON "Communication"("contactId");
CREATE INDEX IF NOT EXISTS "Communication_dealId_idx" ON "Communication"("dealId");
CREATE INDEX IF NOT EXISTS "Communication_ticketId_idx" ON "Communication"("ticketId");

-- ============================================================
-- STEP 14: EmailAttachment table
-- ============================================================
CREATE TABLE IF NOT EXISTS "EmailAttachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communicationId" TEXT NOT NULL,
    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 15: EmailTemplate table
-- ============================================================
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 16: Workflow & AutomationLog
-- ============================================================
CREATE TABLE IF NOT EXISTS "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationLog" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowId" TEXT NOT NULL,
    "triggeredById" TEXT,
    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AutomationLog_workflowId_idx" ON "AutomationLog"("workflowId");

-- ============================================================
-- STEP 17: Notification table
-- ============================================================
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");

-- ============================================================
-- STEP 18: Document table
-- ============================================================
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,
    "dealId" TEXT,
    "parentId" TEXT,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 19: SupportTicket & history
-- ============================================================
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "slaDeadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT,
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_assigneeId_idx" ON "SupportTicket"("assigneeId");

CREATE TABLE IF NOT EXISTS "TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "ticketId" TEXT NOT NULL,
    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 20: Invoice, LineItem, Payment
-- ============================================================
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "dealId" TEXT,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 21: Webhook & Log
-- ============================================================
CREATE TABLE IF NOT EXISTS "Webhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebhookLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "success" BOOLEAN NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookId" TEXT NOT NULL,
    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 22: ActivityLog — add changes column
-- ============================================================
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "changes" JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- STEP 23: CustomFieldDefinition
-- ============================================================
CREATE TABLE IF NOT EXISTS "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomFieldDefinition_entity_fieldKey_key" ON "CustomFieldDefinition"("entity", "fieldKey");

-- ============================================================
-- STEP 24: ApiKey
-- ============================================================
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- ============================================================
-- STEP 25: Foreign key constraints (safe - only if not exists)
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_ownerId_fkey') THEN
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_assigneeId_fkey') THEN
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_accountId_fkey') THEN
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Contact_ownerId_fkey') THEN
        ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Contact_accountId_fkey') THEN
        ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Deal_ownerId_fkey') THEN
        ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Task_ownerId_fkey') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Notification_userId_fkey') THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Communication_userId_fkey') THEN
        ALTER TABLE "Communication" ADD CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SupportTicket_reporterId_fkey') THEN
        ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeadScoreHistory_leadId_fkey') THEN
        ALTER TABLE "LeadScoreHistory" ADD CONSTRAINT "LeadScoreHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DealStageHistory_dealId_fkey') THEN
        ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TicketStatusHistory_ticketId_fkey') THEN
        ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AutomationLog_workflowId_fkey') THEN
        ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InvoiceLineItem_invoiceId_fkey') THEN
        ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payment_invoiceId_fkey') THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookLog_webhookId_fkey') THEN
        ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EmailAttachment_communicationId_fkey') THEN
        ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Team_managerId_fkey') THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_teamId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_managerId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- STEP 26: Insert default role permissions (existing roles only)
-- SUPPORT role permissions must be seeded after this migration
-- commits, since new enum values can't be used in same transaction
-- ============================================================
INSERT INTO "RolePermission" ("id", "role", "resource", "action", "allowed") VALUES
    (gen_random_uuid()::text, 'ADMIN', 'leads', 'read', true),
    (gen_random_uuid()::text, 'ADMIN', 'leads', 'create', true),
    (gen_random_uuid()::text, 'ADMIN', 'leads', 'update', true),
    (gen_random_uuid()::text, 'ADMIN', 'leads', 'delete', true),
    (gen_random_uuid()::text, 'MANAGER', 'leads', 'read', true),
    (gen_random_uuid()::text, 'MANAGER', 'leads', 'create', true),
    (gen_random_uuid()::text, 'MANAGER', 'leads', 'update', true),
    (gen_random_uuid()::text, 'MANAGER', 'leads', 'delete', false),
    (gen_random_uuid()::text, 'USER', 'leads', 'read', true),
    (gen_random_uuid()::text, 'USER', 'leads', 'create', true),
    (gen_random_uuid()::text, 'USER', 'leads', 'update', true),
    (gen_random_uuid()::text, 'USER', 'leads', 'delete', false)
ON CONFLICT DO NOTHING;
