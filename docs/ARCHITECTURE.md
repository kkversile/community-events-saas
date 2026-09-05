# Architecture Notes

## Bounded contexts

- Identity: tenants, communities, users, roles, unit memberships.
- Community master: buildings and physical units/flats.
- Events: event type, event lifecycle, sessions and capacity.
- Participation: one booking or active waitlist entry per event + flat.
- Money: one contribution campaign per event in this MVP, one immutable-ish payment record per submission, explicit treasurer verification.
- Spending: event expenses and categories.
- Communication: published announcements.
- Audit: append-only audit entries for booking/payment sensitive transitions.

## Authority boundary

React captures intent. NestJS owns authorization, tenant scoping, event state, capacity, waitlist promotion, money state and totals. PostgreSQL owns uniqueness and persistence.

The client never supplies `tenantId` or `communityId`; both are derived from the signed access token.

## Critical invariants

1. A flat can have at most one booking row per event (`EventBooking @@unique([eventId, unitId])`).
2. A flat can have at most one waitlist row per event (`WaitlistEntry @@unique([eventId, unitId])`).
3. Session capacity is checked while the `EventSession` row is locked `FOR UPDATE`.
4. Booking is allowed only for published/active events and inside the registration window.
5. Waitlist promotion happens in the same transaction that cancels a confirmed booking.
6. A contribution campaign persists one contribution obligation per active flat.
7. Resident payment submissions start as `MANUAL_PENDING`; only explicit `/payments/:id/verify` marks them verified.
8. Contribution totals are recalculated server-side from verified payments.
9. Pending + verified payment submissions cannot exceed the contribution obligation.
10. Historical masters are disabled, not hard-deleted.

## Local topology

```
Browser :3007
   |
   v
React/Vite
   |
   | Bearer JWT / JSON
   v
NestJS :4007
   |
   v
Prisma
   |
   v
PostgreSQL :5437 (Docker host port)
```

## Cloud pilot topology

```
Vercel (React SPA)
       |
       v
Render (NestJS API)
       |
       v
Neon PostgreSQL
```

## Pilot vs production SaaS

The included build is deliberately optimized for a real apartment pilot. Before broad commercial deployment add OTP or stronger account recovery, refresh-token rotation/HttpOnly cookie strategy, distributed rate limiting, object storage for receipts, managed job queues for notifications, database backups/restore drills, PostgreSQL RLS, payment gateway webhooks/idempotency, observability/APM, and automated concurrency integration tests against PostgreSQL.
