# Community Events SaaS

A production-shaped community management SaaS MVP for apartment and residential-community operations, built with **React, NestJS, Prisma and PostgreSQL**.

The product turns common community-management tasks into structured workflows: resident onboarding, events, slot capacity, waitlists, contributions, payment verification, expenses, announcements, dashboards and reporting.

**Live frontend:** https://community-events-saas-community-eve.vercel.app

## Product problem

Apartment committees often manage registrations, event slots, payments and announcements through spreadsheets and WhatsApp. That works at small scale, but it becomes difficult to track capacity, payment status, resident access and financial reporting consistently.

This MVP models those workflows in one role-based application.

## Core capabilities

- Community and flat/resident login
- Community admin and treasurer roles
- Resident onboarding
- CSV resident import
- Dry-run CSV validation before import
- Temporary-password generation for imported residents
- Forced password change on first login
- Event management
- Slot booking and capacity handling
- Waitlists
- Contribution tracking
- Manual payment verification
- Master-data administration
- Expense tracking
- Announcements
- Dashboards
- Reports

## Architecture

```text
community-events-saas/
├── community-events-frontend/   # React frontend
├── community-events-backend/    # NestJS API
├── docs/
├── scripts/
├── docker-compose.yml
├── render.yaml
└── vercel.json
```

### Frontend

- React
- TypeScript
- API-backed workflows
- Vercel deployment configuration

### Backend

- NestJS
- Prisma
- PostgreSQL
- REST API
- Swagger documentation

### Data

The project supports either:

- local PostgreSQL through Docker, or
- an existing/managed PostgreSQL instance such as Neon.

## Fastest local start

Prerequisites: Node.js 20+ and Docker Desktop.

```bash
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:3004`
- Backend: `http://localhost:4004/api/v1`
- API docs: `http://localhost:4004/docs`

`npm run dev` starts PostgreSQL on port `5437`, pushes the Prisma schema, seeds demo data and starts both applications.

## Demo logins

Community code: `VSRES`

| Role | Mobile | Password |
|---|---:|---|
| Community Admin | 9000000001 | Admin@123 |
| Treasurer | 9000000002 | Treasurer@123 |
| Resident A-209 | 9000000209 | Resident@123 |

These credentials are for the seeded local/demo environment only.

## Use Neon or an existing PostgreSQL database

Copy:

```text
community-events-backend/.env.example
```

to `.env`, replace `DATABASE_URL`, then run:

```bash
npm install
npm run dev:no-docker
```

For Neon, use the pooled PostgreSQL connection string.

## Resident import workflow

Navigate to:

**Admin → Residents → Import CSV**

A sample file is available at `docs/sample-residents.csv`.

The import flow performs a dry-run validation first and imports only when all rows are valid. New accounts receive unique temporary passwords and must change them after first login.

## Deployment

### Backend — Render

- Root directory: `community-events-backend`
- Build: `npm install && npm run build && npx prisma db push`
- Start: `npm run start:prod`
- Required environment: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`

### Frontend — Vercel

- Root directory: `community-events-frontend`
- Build: `npm run build`
- Output: `dist`
- Environment: `VITE_API_URL=https://YOUR-RENDER-API/api/v1`

## Pilot vs commercial production

This repository is intentionally optimized for a low-cost apartment pilot. It currently uses password login and manual payment verification.

A commercial rollout should add or harden:

- Refresh-token rotation
- HttpOnly-cookie authentication or hardened token storage
- OTP authentication where appropriate
- Payment gateway webhooks
- Object storage
- Rate limiting
- Backups and recovery procedures
- PostgreSQL RLS where appropriate
- Production monitoring and alerting

## What this repository demonstrates

This project demonstrates the full path from a real community problem to a working SaaS MVP: **requirements translation, role-based workflows, database-backed business logic, CSV onboarding, booking/waitlist behaviour, payment administration, reporting and deployable full-stack architecture**.
