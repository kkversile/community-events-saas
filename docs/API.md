# API inventory

Base path: `/api/v1`

## Auth
- `POST /auth/login`
- `POST /auth/change-password`

## Buildings / flats / residents
- `GET /buildings`
- `POST /buildings`
- `PATCH /buildings/:id`
- `GET /units`
- `POST /units`
- `PATCH /units/:id`
- `GET /residents`
- `POST /residents`
- `PATCH /residents/:id`
- `POST /residents/import` (`dryRun: true` for preflight)

## Masters
- `GET /masters/event-types`
- `POST /masters/event-types`
- `PATCH /masters/event-types/:id`
- `GET /masters/expense-categories`
- `POST /masters/expense-categories`
- `PATCH /masters/expense-categories/:id`

## Events
- `GET /events`
- `POST /events`
- `GET /events/:id`
- `PATCH /events/:id`
- `POST /events/:id/publish`
- `GET /events/:id/resident-view`
- `GET /events/:id/participation` (committee view)
- `GET /events/:eventId/sessions`
- `POST /events/:eventId/sessions/generate`

## Participation
- `POST /event-sessions/:sessionId/book`
- `POST /bookings/:bookingId/cancel`
- `POST /waitlist/:waitlistId/cancel`

## Contributions and payments
- `GET /events/:eventId/contribution-campaigns`
- `POST /events/:eventId/contribution-campaigns`
- `POST /contributions/:contributionId/payments`
- `GET /payments`
- `POST /payments/:id/verify`
- `POST /payments/:id/reject`

## Expenses / reports / announcements
- `GET /expenses`
- `POST /expenses`
- `PATCH /expenses/:id`
- `GET /reports/contributions`
- `GET /announcements`
- `POST /announcements`
- `GET /me/dashboard`
- `GET /admin/dashboard`
- `GET /health`

Swagger UI is available at `/docs` in local and deployed backend environments.
