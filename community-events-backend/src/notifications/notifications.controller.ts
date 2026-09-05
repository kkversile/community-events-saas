import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestContext } from '../common/types/request-context';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get('public-key') publicKey() { return { success: true, data: { publicKey: this.notifications.publicKey() } }; }
  @Post('subscriptions') async subscribe(@CurrentContext() ctx: RequestContext, @Body() body: any) {
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) return { success: false, error: { message: 'Invalid push subscription' } };
    await this.notifications.saveSubscription(ctx, body); return { success: true, data: { subscribed: true } };
  }
  @Delete('subscriptions') async unsubscribe(@CurrentContext() ctx: RequestContext, @Body() body: { endpoint?: string }) {
    if (body?.endpoint) await this.notifications.removeSubscription(ctx.userId, body.endpoint); return { success: true, data: { subscribed: false } };
  }
}
