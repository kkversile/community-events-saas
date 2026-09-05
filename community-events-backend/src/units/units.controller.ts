import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { RequestContext } from '../common/types/request-context'; import { CreateUnitDto, UpdateUnitDto } from './units.dto';
@Controller('units') @UseGuards(JwtAuthGuard, RolesGuard)
export class UnitsController { constructor(private prisma: PrismaService) {}
  @Get() async list(@CurrentContext() ctx: RequestContext, @Query('buildingId') buildingId?: string) { return { success:true, data: await this.prisma.unit.findMany({ where:{ tenantId:ctx.tenantId, communityId:ctx.communityId, ...(buildingId?{buildingId}: {}) }, include:{ building:true, memberships:{ where:{endsAt:null}, include:{user:true} } }, orderBy:[{building:{sortOrder:'asc'}},{unitNumber:'asc'}] }) }; }
  @Post() @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN) async create(@CurrentContext() ctx:RequestContext,@Body() dto:CreateUnitDto){ const b=await this.prisma.building.findFirstOrThrow({where:{id:dto.buildingId,tenantId:ctx.tenantId,communityId:ctx.communityId}}); return {success:true,data:await this.prisma.unit.create({data:{tenantId:ctx.tenantId,communityId:ctx.communityId,buildingId:b.id,unitNumber:dto.unitNumber.trim(),floor:dto.floor,unitType:dto.unitType}})}; }
  @Patch(':id') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN) async update(@CurrentContext() ctx:RequestContext,@Param('id') id:string,@Body() dto:UpdateUnitDto){ const row=await this.prisma.unit.findFirstOrThrow({where:{id,tenantId:ctx.tenantId,communityId:ctx.communityId}}); return {success:true,data:await this.prisma.unit.update({where:{id:row.id},data:dto})}; }
}
