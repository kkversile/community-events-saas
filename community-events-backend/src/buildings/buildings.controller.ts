import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestContext } from '../common/types/request-context';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
@Controller('buildings') @UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@CurrentContext() ctx: RequestContext) { return { success: true, data: await this.prisma.building.findMany({ where: { tenantId: ctx.tenantId, communityId: ctx.communityId }, include: { _count: { select: { units: true } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }) }; }
  @Post() @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async create(@CurrentContext() ctx: RequestContext, @Body() dto: CreateBuildingDto) { return { success: true, data: await this.prisma.building.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, name: dto.name.trim(), code: dto.code.toUpperCase(), sortOrder: dto.sortOrder ?? 0 } }) }; }
  @Patch(':id') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async update(@CurrentContext() ctx: RequestContext, @Param('id') id: string, @Body() dto: UpdateBuildingDto) { const row = await this.prisma.building.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId, communityId: ctx.communityId } }); return { success: true, data: await this.prisma.building.update({ where: { id: row.id }, data: dto }) }; }
  @Delete(':id') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async remove(@CurrentContext() ctx: RequestContext, @Param('id') id: string) {
    const row = await this.prisma.building.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId, communityId: ctx.communityId } });
    const units = await this.prisma.unit.findMany({ where: { buildingId: row.id, tenantId: ctx.tenantId, communityId: ctx.communityId }, select: { id: true } });
    const unitIds = units.map((unit) => unit.id);
    await this.prisma.$transaction([
      this.prisma.payment.deleteMany({ where: { contribution: { unitId: { in: unitIds } } } }),
      this.prisma.contribution.deleteMany({ where: { unitId: { in: unitIds } } }),
      this.prisma.eventBooking.deleteMany({ where: { unitId: { in: unitIds } } }),
      this.prisma.waitlistEntry.deleteMany({ where: { unitId: { in: unitIds } } }),
      this.prisma.unitMembership.deleteMany({ where: { unitId: { in: unitIds } } }),
      this.prisma.unit.deleteMany({ where: { id: { in: unitIds } } }),
      this.prisma.building.delete({ where: { id: row.id } }),
    ]);
    return { success: true, data: { id: row.id, deleted: true, flatsDeleted: unitIds.length } };
  }
}
