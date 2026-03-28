# NexusCRM - Production-Ready CRM PWA

A complete, full-stack, production-ready CRM (Customer Relationship Management) web application with a premium SaaS UI, PWA support, and enterprise-grade security.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand + React Query |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Security | bcrypt, Helmet, Rate Limiting, Zod |
| PWA | Vite PWA Plugin + Service Worker |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone & Setup

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
```

### 2. Database Setup

```bash
cd backend
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with demo data
npm run prisma:seed
```

### 3. Start Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open: http://localhost:5173

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@crm.com | Admin@123 |
| User | user@crm.com | User@123 |

## Features

### Authentication
- Register / Login with full validation
- bcrypt password hashing (12 rounds)
- JWT access tokens (15min) + refresh tokens (7d)
- Automatic token rotation
- Secure logout with token invalidation

### RBAC
- Admin / Manager / User roles
- Route protection (frontend + backend)
- Role-based component rendering

### CRM Modules
- **Leads** — Full CRUD with status tracking
- **Contacts** — Contact management with company info
- **Deals** — Sales deals with pipeline stages
- **Tasks** — Task management with priorities
- **Pipeline** — Visual Kanban board
- **Reports** — Analytics with charts
- 14 more premium modules (configurable)

### Dashboard
- Real-time stats cards with trends
- Revenue area chart
- Pipeline bar chart
- Task donut chart
- Recent activity feed

### PWA Features
- Service Worker with offline support
- Web App Manifest
- Install prompt
- Background sync ready
- Stale-while-revalidate caching

### UI/UX
- Premium dark mode design
- Glassmorphism effects
- Framer Motion animations
- Skeleton loaders
- Mobile-responsive (mobile-first)
- Collapsible sidebar
- Theme & accent color customization

## Project Structure

```
CRM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Seed data
│   └── src/
│       ├── config/           # DB + env config
│       ├── controllers/      # Route handlers
│       ├── middleware/        # Auth, RBAC, validate
│       ├── routes/           # API routes
│       └── utils/            # JWT, hash, validation
├── frontend/
│   ├── public/
│   │   └── manifest.json     # PWA manifest
│   └── src/
│       ├── components/       # UI + layout + modules
│       ├── hooks/            # Custom React hooks
│       ├── pages/            # Route pages
│       ├── services/         # API service layer
│       ├── store/            # Zustand stores
│       ├── types/            # TypeScript types
│       └── utils/            # Helpers + formatters
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`

### Leads (JWT required)
- `GET    /api/v1/leads`
- `POST   /api/v1/leads`
- `GET    /api/v1/leads/:id`
- `PUT    /api/v1/leads/:id`
- `DELETE /api/v1/leads/:id`

### Contacts, Deals, Tasks — same CRUD pattern

### Dashboard
- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/activity`

### Preferences
- `GET /api/v1/preferences`
- `PUT /api/v1/preferences`

## Security

- JWT with RS256-compatible secrets
- bcrypt with 12 salt rounds
- Helmet.js security headers
- Global + auth-specific rate limiting
- Zod input validation on all endpoints
- CORS with whitelist
- SQL injection protection via Prisma
- Refresh token rotation
- Activity logging

## Production Build

```bash
# Backend
cd backend && npm run build
node dist/server.js

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx/caddy
```
