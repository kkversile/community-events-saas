import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/types/request-context';
import { CreateBookingDto } from './bookings.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async book(ctx: RequestContext, sessionId: string, dto: CreateBookingDto) {
    if (!ctx.unitId) throw new BadRequestException('No active flat linked to this login');
    if (dto.adults + dto.children + dto.seniors < 1) throw new BadRequestException('At least one participant is required');

    try {
      return await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; eventId: string; sessionDate: Date; capacity: number | null; allowWaitlist: boolean; isActive: boolean; eventStatus: string; registrationOpenAt: Date | null; registrationCloseAt: Date | null }>>(Prisma.sql`
        SELECT s.id, s."eventId", s."sessionDate", s.capacity, s."allowWaitlist", s."isActive",
               e.status::text AS "eventStatus", e."registrationOpenAt", e."registrationCloseAt"
        FROM "EventSession" s
        JOIN "Event" e ON e.id = s."eventId"
        WHERE s.id = ${sessionId} AND s."tenantId" = ${ctx.tenantId} AND s."communityId" = ${ctx.communityId}
        FOR UPDATE OF s
      `);
      const session = locked[0];
      if (!session) throw new NotFoundException('Session not found');
      if (!session.isActive) throw new BadRequestException('Session is not active');
      if (!['PUBLISHED', 'ACTIVE'].includes(session.eventStatus)) throw new BadRequestException('Event is not open for resident booking');
      const now = new Date();
      if (session.registrationOpenAt && now < session.registrationOpenAt) throw new BadRequestException('Registration has not opened yet');
      if (session.registrationCloseAt && now > session.registrationCloseAt) throw new BadRequestException('Registration is closed');

      const confirmedElsewhere = await tx.eventBooking.findFirst({
        where: { eventId: session.eventId, unitId: ctx.unitId!, status: 'CONFIRMED', NOT: { sessionId } },
      });
      if (confirmedElsewhere) throw new ConflictException('This flat already has a confirmed booking for this event');
      const waitElsewhere = await tx.waitlistEntry.findFirst({
        where: { eventId: session.eventId, unitId: ctx.unitId!, cancelledAt: null, promotedAt: null, NOT: { sessionId } },
      });
      if (waitElsewhere) throw new ConflictException('This flat is already waitlisted for another date in this event');

      const existing = await tx.eventBooking.findUnique({ where: { eventId_unitId: { eventId: session.eventId, unitId: ctx.unitId! } } });
      if (existing?.status === 'CONFIRMED') throw new ConflictException('This flat is already booked for this event');

      const existingWait = await tx.waitlistEntry.findUnique({ where: { eventId_unitId: { eventId: session.eventId, unitId: ctx.unitId! } } });
      if (existingWait && !existingWait.cancelledAt && !existingWait.promotedAt) throw new ConflictException('This flat is already on the waitlist');

      const confirmed = await tx.eventBooking.count({ where: { sessionId, status: 'CONFIRMED' } });
      const full = session.capacity !== null && confirmed >= session.capacity;
      if (full) {
        if (!session.allowWaitlist || !dto.joinWaitlistIfFull) throw new ConflictException('EVENT_SESSION_FULL');
        const max = await tx.waitlistEntry.aggregate({ where: { sessionId }, _max: { position: true } });
        const position = (max._max.position ?? 0) + 1;
        const wait = existingWait
          ? await tx.waitlistEntry.update({ where: { id: existingWait.id }, data: { sessionId, position, cancelledAt: null, promotedAt: null, adults: dto.adults, children: dto.children, seniors: dto.seniors, notes: dto.notes } })
          : await tx.waitlistEntry.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, eventId: session.eventId, sessionId, unitId: ctx.unitId!, userId: ctx.userId, position, adults: dto.adults, children: dto.children, seniors: dto.seniors, notes: dto.notes } });
        await tx.auditLog.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, actorUserId: ctx.userId, entityType: 'WaitlistEntry', entityId: wait.id, action: 'WAITLIST_JOINED', newValue: { sessionId, unitId: ctx.unitId, position } } });
        return { status: 'WAITLISTED', waitlistId: wait.id, position };
      }

      const booking = existing
        ? await tx.eventBooking.update({ where: { id: existing.id }, data: { sessionId, status: 'CONFIRMED', cancelledAt: null, adults: dto.adults, children: dto.children, seniors: dto.seniors, notes: dto.notes } })
        : await tx.eventBooking.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, eventId: session.eventId, sessionId, unitId: ctx.unitId!, userId: ctx.userId, adults: dto.adults, children: dto.children, seniors: dto.seniors, notes: dto.notes } });
      await tx.auditLog.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, actorUserId: ctx.userId, entityType: 'EventBooking', entityId: booking.id, action: 'BOOKING_CREATED', newValue: { sessionId, unitId: ctx.unitId } } });
      return { status: 'CONFIRMED', booking };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This flat already has a booking or waitlist entry for this event');
      }
      throw error;
    }
  }

  async cancelWaitlist(ctx: RequestContext, waitlistId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({ where: { id: waitlistId, tenantId: ctx.tenantId, communityId: ctx.communityId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    const isAdmin = ctx.roles.some(r => ([PlatformRole.SUPER_ADMIN, PlatformRole.COMMUNITY_ADMIN, PlatformRole.EVENT_ADMIN] as PlatformRole[]).includes(r));
    if (!isAdmin && entry.unitId !== ctx.unitId) throw new ForbiddenException('You cannot cancel another flat waitlist entry');
    if (entry.promotedAt) throw new BadRequestException('This waitlist entry was already promoted');
    if (entry.cancelledAt) return entry;
    const updated = await this.prisma.waitlistEntry.update({ where: { id: entry.id }, data: { cancelledAt: new Date() } });
    await this.prisma.auditLog.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, actorUserId: ctx.userId, entityType: 'WaitlistEntry', entityId: entry.id, action: 'WAITLIST_CANCELLED', oldValue: { cancelledAt: null }, newValue: { cancelledAt: updated.cancelledAt?.toISOString() } } });
    return updated;
  }

  async cancel(ctx: RequestContext, bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.eventBooking.findFirst({ where: { id: bookingId, tenantId: ctx.tenantId, communityId: ctx.communityId } });
      if (!booking) throw new NotFoundException('Booking not found');
      const isAdmin = ctx.roles.some(r => ([PlatformRole.SUPER_ADMIN, PlatformRole.COMMUNITY_ADMIN, PlatformRole.EVENT_ADMIN] as PlatformRole[]).includes(r));
      if (!isAdmin && booking.unitId !== ctx.unitId) throw new ForbiddenException('You cannot cancel another flat booking');
      if (booking.status === 'CANCELLED') return { cancelled: booking, promoted: null, alreadyCancelled: true };
      if (booking.status !== 'CONFIRMED') throw new BadRequestException('Only confirmed bookings can be cancelled');
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "EventSession" WHERE id = ${booking.sessionId} FOR UPDATE`);
      const cancelled = await tx.eventBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      const next = await tx.waitlistEntry.findFirst({ where: { sessionId: booking.sessionId, cancelledAt: null, promotedAt: null }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
      let promoted = null;
      if (next) {
        const previous = await tx.eventBooking.findUnique({ where: { eventId_unitId: { eventId: next.eventId, unitId: next.unitId } } });
        promoted = previous
          ? await tx.eventBooking.update({ where: { id: previous.id }, data: { sessionId: next.sessionId, status: 'CONFIRMED', cancelledAt: null, userId: next.userId, adults: next.adults, children: next.children, seniors: next.seniors, notes: next.notes } })
          : await tx.eventBooking.create({ data: { tenantId: next.tenantId, communityId: next.communityId, eventId: next.eventId, sessionId: next.sessionId, unitId: next.unitId, userId: next.userId, adults: next.adults, children: next.children, seniors: next.seniors, notes: next.notes } });
        await tx.waitlistEntry.update({ where: { id: next.id }, data: { promotedAt: new Date() } });
        await tx.auditLog.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, actorUserId: ctx.userId, entityType: 'WaitlistEntry', entityId: next.id, action: 'WAITLIST_PROMOTED', newValue: { bookingId: promoted.id, sessionId: next.sessionId, unitId: next.unitId } } });
      }
      await tx.auditLog.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, actorUserId: ctx.userId, entityType: 'EventBooking', entityId: booking.id, action: 'BOOKING_CANCELLED', oldValue: { status: booking.status }, newValue: { status: 'CANCELLED', promotedBookingId: promoted?.id ?? null } } });
      return { cancelled, promoted };
    });
  }
}
