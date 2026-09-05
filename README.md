# Community Events SaaS – Apartment Pilot

Production-shaped React + NestJS + PostgreSQL MVP for community events, flat/resident login, CSV resident import, slot booking, waitlists, contribution tracking, manual payment verification, masters, dashboards, reports, expenses and announcements.

## Fastest local start

Prerequisites: Node.js 20+ and Docker Desktop.

```bash
npm install
npm run dev
```

Open:
- Frontend: http://localhost:3004
- Backend: http://localhost:4004/api/v1
- API docs: http://localhost:4004/docs

`npm run dev` starts PostgreSQL on port 5437, pushes the Prisma schema, seeds demo data and starts both apps.

### Seed logins

Community code: `VSRES`

| Role | Mobile | Password |
|---|---|---|
| Community Admin | 9000000001 | Admin@123 |
| Treasurer | 9000000002 | Treasurer@123 |
| Resident A-209 | 9000000209 | Resident@123 |

## Use Neon / existing PostgreSQL instead of Docker

Copy `community-events-backend/.env.example` to `.env`, replace `DATABASE_URL`, then:

```bash
npm install
npm run dev:no-docker
```

For Neon use the pooled PostgreSQL connection string.

## Deployment

### Backend / Render
- Root directory: `community-events-backend`
- Build: `npm install && npm run build && npx prisma db push`
- Start: `npm run start:prod`
- Environment: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`

### Frontend / Vercel
- Root directory: `community-events-frontend`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://YOUR-RENDER-API/api/v1`

## Important pilot note

This MVP deliberately uses password login and manual payment verification to keep the apartment pilot cheap. For a commercial launch add refresh-token rotation, HttpOnly-cookie auth or hardened token storage, OTP, gateway webhooks, object storage, rate limits, backups and PostgreSQL RLS.

## Resident import

Admin → Residents → Import CSV. A sample is in `docs/sample-residents.csv`. The UI runs a dry-run validation first and only imports when all rows are valid. New accounts receive unique temporary passwords and are forced to change them after first login.
