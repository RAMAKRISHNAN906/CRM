-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateTable
CREATE TABLE "Project" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "status"      "ProjectStatus"   NOT NULL DEFAULT 'PLANNING',
    "priority"    "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "budget"      DOUBLE PRECISION,
    "tags"        TEXT[]   NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deletedAt"   TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id"        TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'member',
    "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "status"      "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority"    "ProjectPriority"   NOT NULL DEFAULT 'MEDIUM',
    "dueDate"     TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "projectId"   TEXT NOT NULL,
    "assigneeId"  TEXT,
    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Project_status_idx"          ON "Project"("status");
CREATE INDEX "Project_createdById_idx"     ON "Project"("createdById");
CREATE INDEX "Project_deletedAt_idx"       ON "Project"("deletedAt");
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX "ProjectMember_userId_idx"    ON "ProjectMember"("userId");
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId","userId");
CREATE INDEX "ProjectTask_projectId_idx"   ON "ProjectTask"("projectId");
CREATE INDEX "ProjectTask_status_idx"      ON "ProjectTask"("status");
CREATE INDEX "ProjectTask_assigneeId_idx"  ON "ProjectTask"("assigneeId");

-- Foreign Keys
ALTER TABLE "Project"       ADD CONSTRAINT "Project_createdById_fkey"       FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey"   FOREIGN KEY ("projectId")  REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey"      FOREIGN KEY ("userId")     REFERENCES "User"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectTask"   ADD CONSTRAINT "ProjectTask_projectId_fkey"     FOREIGN KEY ("projectId")  REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask"   ADD CONSTRAINT "ProjectTask_assigneeId_fkey"    FOREIGN KEY ("assigneeId") REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE;
