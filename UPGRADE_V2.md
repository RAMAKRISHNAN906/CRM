# NexusCRM Enterprise Upgrade v2 — Integration Guide

## STEP-BY-STEP DEPLOYMENT

### 1. Apply Schema Additions to schema.prisma
Copy everything from `backend/prisma/schema_additions.prisma` into `backend/prisma/schema.prisma`
AND add these fields to existing models:

```prisma
// In Deal model, add:
stageId       String?
pipelineStage PipelineStage? @relation(fields: [stageId], references: [id])
demoDetail    DemoDetail?
competitors   Competitor[]
quotes        Quote[]
purchaseOrders PurchaseOrder[]

// In User model, add:
preferredLanguage String? @default("en")
quotes            Quote[]
purchaseOrders    PurchaseOrder[]

// In Contact model, add:
preferredLanguage String? @default("en")
quotes            Quote[]

// In Task model, add:
followUpStatus String?
completionPct  Int     @default(0)
subTasks       SubTask[]

// In Invoice model, add:
purchaseOrders PurchaseOrder[]
```

### 2. Run Migration
```bash
cd backend
npx prisma migrate dev --name enterprise_upgrade_v2
npx prisma generate
```

### 3. Restart Backend
```bash
npm run build && node dist/server.js
```

### 4. Start Reminder Engine (add to server.ts)
```typescript
import { startReminderEngine } from './services/reminderEngine.service';
// After prisma connects:
startReminderEngine(60); // check every 60 minutes
```

### 5. Frontend
```bash
cd frontend && npm run dev
```

---

## WHAT WAS BUILT — FEATURE MAP

| # | Feature | Backend Files | Frontend Files |
|---|---------|--------------|----------------|
| 1 | Dynamic Pipeline Stages | `controllers/pipeline.controller.ts` `routes/pipeline.routes.ts` | `pages/modules/PipelinePage.tsx` (rewritten) `services/pipeline.service.ts` |
| 2 | Demo Stage Fields | `pipeline.controller.ts` (getDemoDetail, upsertDemoDetail) | PipelinePage DemoPanel component |
| 3 | Advanced Quotation System | `controllers/quotes.controller.ts` `routes/quotes.routes.ts` | `pages/modules/QuotesPage.tsx` (full rewrite) `services/quotes.service.ts` |
| 4 | Purchase Order Flow | `controllers/purchaseOrders.controller.ts` `routes/purchaseOrders.routes.ts` | (use existing InvoicesPage pattern) |
| 5 | Follow-up & Reminder Engine | `services/reminderEngine.service.ts` | SubTaskProgress (TASK_DUE notifications) |
| 6 | Multilingual System | `controllers/settings.controller.ts` (languages) | `i18n/index.ts` + `LanguageSwitcher` component |
| 7 | Festival Automation | `controllers/festivals.controller.ts` `routes/festivals.routes.ts` | `pages/modules/FestivalsPage.tsx` `services/festivals.service.ts` |
| 8 | Competitor Tracking | `controllers/competitors.controller.ts` `routes/competitors.routes.ts` | Add CompetitorPanel to DealsPage |
| 9 | Task Progress + SubTasks | `controllers/subtasks.controller.ts` `routes/subtasks.routes.ts` | `components/ui/SubTaskProgress.tsx` |
| 10 | Country Analytics | `controllers/export.controller.ts` (exportCountryReport) | `pages/modules/CountryAnalyticsPage.tsx` |
| 11 | Export System | `controllers/export.controller.ts` `routes/export.routes.ts` | `services/export.service.ts` |

---

## NEW API ENDPOINTS

```
# Pipeline
GET    /api/pipeline/stages
POST   /api/pipeline/stages
PUT    /api/pipeline/stages/reorder
PUT    /api/pipeline/stages/:id
DELETE /api/pipeline/stages/:id
GET    /api/pipeline/board          ← dynamic kanban data
GET    /api/pipeline/demo/:dealId
PUT    /api/pipeline/demo/:dealId

# Quotes
GET    /api/quotes
POST   /api/quotes
GET    /api/quotes/:id
PUT    /api/quotes/:id
DELETE /api/quotes/:id
POST   /api/quotes/:id/convert      ← SQ→SO→SI
GET    /api/quotes/payment-terms
POST   /api/quotes/payment-terms
PUT    /api/quotes/payment-terms/:id
DELETE /api/quotes/payment-terms/:id

# Purchase Orders
GET    /api/purchase-orders
POST   /api/purchase-orders
GET    /api/purchase-orders/:id
PUT    /api/purchase-orders/:id
DELETE /api/purchase-orders/:id

# Competitors
GET    /api/competitors?dealId=xxx
POST   /api/competitors
PUT    /api/competitors/:id
DELETE /api/competitors/:id

# Festivals
GET    /api/festivals
POST   /api/festivals
PUT    /api/festivals/:id
DELETE /api/festivals/:id
POST   /api/festivals/:id/messages
PUT    /api/festivals/messages/:msgId
DELETE /api/festivals/messages/:msgId
POST   /api/festivals/:id/send      ← triggers greetings to all contacts

# Settings
GET    /api/settings/company
PUT    /api/settings/company
GET    /api/settings/languages
POST   /api/settings/languages

# Subtasks
GET    /api/tasks/:taskId/subtasks
POST   /api/tasks/:taskId/subtasks
PUT    /api/tasks/:taskId/subtasks/:id
DELETE /api/tasks/:taskId/subtasks/:id

# Export
GET    /api/export/leads?format=csv|json
GET    /api/export/deals?format=csv|json
GET    /api/export/reports/country?format=csv|json
```

---

## INTEGRATION POINTS WITH EXISTING SYSTEM

### RBAC (unchanged)
All new controllers read `req.user.role` and apply the same manager/user split as existing controllers.
Export endpoints: managers get all data, users get only owned records.

### Automation Engine (existing, extended)
Festival `sendFestivalGreetings` writes to `Communication` model (existing).
Reminder Engine writes to `Notification` model (existing).
Both are fully visible in existing AutomationPage logs.

### Communication System (existing, extended)
Festival greetings create `Communication` records with channel=EMAIL|SMS|WHATSAPP.
Reminder engine creates `Communication` records with channel=SMS.
Both show in existing EmailPage/CommunicationsPage.

### Pipeline (backward compatible)
- Old `stage` enum column remains on Deal — not deleted
- New `stageId` column is nullable — existing deals without stageId show in static enum pipeline
- PipelinePage now uses `/pipeline/board` (dynamic) instead of `/deals/pipeline` (static)
- Old `/deals/pipeline` endpoint still exists and works

---

## ADDING LANGUAGE SWITCHER TO THE UI

In your Layout/Header component, import and render:

```tsx
import { LanguageSwitcher } from '../../i18n';
// Inside your header:
<LanguageSwitcher />
```

For RTL support, the `useI18n().setLang('ar')` call automatically sets `document.dir = 'rtl'`.
Add `dir={dir}` to your top-level `<div>` in Layout.

---

## ADDING SUBTASK PROGRESS TO TASKS

In your task detail modal/panel, add:

```tsx
import { SubTaskProgress } from '../../components/ui/SubTaskProgress';
// Inside the modal:
<SubTaskProgress taskId={task.id} completionPct={task.completionPct ?? 0} />
```

---

## ADDING COMPETITORS TO DEAL DETAIL

```tsx
// In DealsPage detail modal, add a Competitors section:
import api from '../../services/api';

const { data: competitors = [] } = useQuery({
  queryKey: ['competitors', dealId],
  queryFn: async () => (await api.get(`/competitors?dealId=${dealId}`)).data.data,
});
```

---

## PERFORMANCE NOTES

- PipelineStage queries are O(stages) not O(all deals) — indexed
- Quote number generation uses DB `findFirst` with `startsWith` + index on quoteNumber
- Reminder engine uses `setInterval` — replace with node-cron or BullMQ for production
- Export endpoints stream CSV directly — no buffering large files in memory
- All new tables have deletedAt soft-delete indexes where applicable
- Festival send is synchronous for now — move to a queue for large contact lists (>10k)
