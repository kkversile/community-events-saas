import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly configured: boolean;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
    this.configured = Boolean(publicKey && privateKey);
    if (this.configured) webpush.setVapidDetails(subject, publicKey!, privateKey!);
  }

  publicKey() { return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null; }

  async saveSubscription(ctx: { tenantId: string; communityId: string; userId: string }, subscription: Subscription) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { ...ctx, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      update: { ...ctx, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
  }

  async removeSubscription(userId: string, endpoint: string) { await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } }); }

  async notifyCommunity(ctx: { tenantId: string; communityId: string }, payload: { title: string; message: string; url?: string }) {
    if (!this.configured) { this.logger.warn('Push keys are not configured; announcement stored without push delivery'); return; }
    const rows = await this.prisma.pushSubscription.findMany({ where: ctx });
    await Promise.all(rows.map(async row => {
      try { await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload)); }
      catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await this.prisma.pushSubscription.delete({ where: { id: row.id } }); else this.logger.warn(`Push delivery failed: ${error?.message ?? error}`); }
    }));
  }
}
