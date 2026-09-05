import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MastersModule } from './masters/masters.module';
import { BuildingsModule } from './buildings/buildings.module';
import { UnitsModule } from './units/units.module';
import { ResidentsModule } from './residents/residents.module';
import { EventsModule } from './events/events.module';
import { SessionsModule } from './sessions/sessions.module';
import { BookingsModule } from './bookings/bookings.module';
import { ContributionsModule } from './contributions/contributions.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { HealthController } from './health.controller';
import { SecurityModule } from './common/security.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SecurityModule,
    MastersModule,
    BuildingsModule,
    UnitsModule,
    ResidentsModule,
    EventsModule,
    SessionsModule,
    BookingsModule,
    ContributionsModule,
    PaymentsModule,
    ExpensesModule,
    DashboardModule,
    AnnouncementsModule,
  ],
})
export class AppModule {}
