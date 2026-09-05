import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestContext } from '../common/types/request-context';
import { CreateBookingDto } from './bookings.dto';
import { BookingsService } from './bookings.service';
@Controller() @UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private svc: BookingsService) {}
  @Post('event-sessions/:sessionId/book') async book(@CurrentContext() c: RequestContext, @Param('sessionId') id: string, @Body() d: CreateBookingDto) { return { success: true, data: await this.svc.book(c, id, d) }; }
  @Post('waitlist/:waitlistId/cancel') async cancelWaitlist(@CurrentContext() c: RequestContext, @Param('waitlistId') id: string) { return { success: true, data: await this.svc.cancelWaitlist(c, id) }; }
  @Post('bookings/:bookingId/cancel') async cancel(@CurrentContext() c: RequestContext, @Param('bookingId') id: string) { return { success: true, data: await this.svc.cancel(c, id) }; }
}
