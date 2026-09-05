import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestContext } from '../common/types/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMasterDto, UpdateMasterDto } from './masters.dto';

@Controller('masters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MastersController {
  constructor(private prisma: PrismaService) {}

  @Get('event-types')
  async eventTypes(@CurrentContext() ctx: RequestContext) {
    return { success: true, data: await this.prisma.eventType.findMany({ where: { tenantId: ctx.tenantId, communityId: ctx.communityId }, orderBy: { name: 'asc' } }) };
  }

  @Post('event-types') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async createEventType(@CurrentContext() ctx: RequestContext, @Body() dto: CreateMasterDto) {
    return { success: true, data: await this.prisma.eventType.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, code: dto.code.toUpperCase(), name: dto.name.trim(), description: dto.description?.trim() } }) };
  }

  @Patch('event-types/:id') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.SUPER_ADMIN)
  async updateEventType(@CurrentContext() ctx: RequestContext, @Param('id') id: string, @Body() dto: UpdateMasterDto) {
    const found = await this.prisma.eventType.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId, communityId: ctx.communityId } });
    return { success: true, data: await this.prisma.eventType.update({ where: { id: found.id }, data: { name: dto.name?.trim(), description: dto.description?.trim(), isActive: dto.isActive } }) };
  }

  @Get('expense-categories')
  async expenseCategories(@CurrentContext() ctx: RequestContext) {
    return { success: true, data: await this.prisma.expenseCategory.findMany({ where: { tenantId: ctx.tenantId, communityId: ctx.communityId }, orderBy: { name: 'asc' } }) };
  }

  @Post('expense-categories') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.TREASURER, PlatformRole.SUPER_ADMIN)
  async createExpenseCategory(@CurrentContext() ctx: RequestContext, @Body() dto: CreateMasterDto) {
    return { success: true, data: await this.prisma.expenseCategory.create({ data: { tenantId: ctx.tenantId, communityId: ctx.communityId, code: dto.code.toUpperCase(), name: dto.name.trim() } }) };
  }

  @Patch('expense-categories/:id') @Roles(PlatformRole.COMMUNITY_ADMIN, PlatformRole.TREASURER, PlatformRole.SUPER_ADMIN)
  async updateExpenseCategory(@CurrentContext() ctx: RequestContext, @Param('id') id: string, @Body() dto: UpdateMasterDto) {
    const found = await this.prisma.expenseCategory.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId, communityId: ctx.communityId } });
    return { success: true, data: await this.prisma.expenseCategory.update({ where: { id: found.id }, data: { name: dto.name?.trim(), isActive: dto.isActive } }) };
  }
}
