import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestContext } from '../common/types/request-context';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('community')
  @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async createCommunity(@CurrentContext() ctx: RequestContext, @Body() body: { name: string; code: string; blockName?: string; blockCode?: string; flatCount?: number; firstFlat?: number }) {
    const name = String(body?.name ?? '').trim();
    const code = String(body?.code ?? '').trim().toUpperCase();
    const blockName = String(body?.blockName ?? 'Block A').trim();
    const blockCode = String(body?.blockCode ?? 'A').trim().toUpperCase();
    const flatCount = Math.max(1, Math.min(500, Number(body?.flatCount ?? 10)));
    const firstFlat = Math.max(1, Number(body?.firstFlat ?? 101));
    if (!name || !code || !/^[A-Z0-9_-]{2,20}$/.test(code)) throw new BadRequestException('Community name and a valid code are required');
    const existing = await this.prisma.community.findFirst({ where: { tenantId: ctx.tenantId, code } });
    if (existing) throw new BadRequestException(`Community code ${code} already exists`);
    const result = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({ data: { tenantId: ctx.tenantId, name, code } });
      const building = await tx.building.create({ data: { tenantId: ctx.tenantId, communityId: community.id, name: blockName, code: blockCode, sortOrder: 1 } });
      const units = Array.from({ length: flatCount }, (_, index) => ({ tenantId: ctx.tenantId, communityId: community.id, buildingId: building.id, unitNumber: String(firstFlat + index), floor: String(Math.floor((firstFlat + index) / 100)) }));
      await tx.unit.createMany({ data: units });
      await tx.userCommunityRole.create({ data: { tenantId: ctx.tenantId, communityId: community.id, userId: ctx.userId, role: PlatformRole.COMMUNITY_ADMIN } });
      return { community, building, flatCount };
    });
    return { success: true, data: result };
  }
}
