import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'; import { PlatformRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; import { CurrentContext } from '../common/decorators/current-context.decorator'; import { Roles } from '../common/decorators/roles.decorator'; import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { RequestContext } from '../common/types/request-context'; import { CreateCampaignDto } from './contributions.dto';
@Controller('events/:eventId/contribution-campaigns') @UseGuards(JwtAuthGuard,RolesGuard)
export class ContributionsController{constructor(private prisma:PrismaService){}
 @Get() async list(@CurrentContext() c:RequestContext,@Param('eventId') eventId:string){return{success:true,data:await this.prisma.contributionCampaign.findMany({where:{tenantId:c.tenantId,communityId:c.communityId,eventId},include:{_count:{select:{contributions:true}}}})}}
 @Post() @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.TREASURER,PlatformRole.SUPER_ADMIN)
 async create(@CurrentContext() c:RequestContext,@Param('eventId') eventId:string,@Body() d:CreateCampaignDto){
  const event=await this.prisma.event.findFirstOrThrow({where:{id:eventId,tenantId:c.tenantId,communityId:c.communityId}});
  const campaign=await this.prisma.$transaction(async tx=>{const cp=await tx.contributionCampaign.create({data:{tenantId:c.tenantId,communityId:c.communityId,eventId:event.id,name:d.name,amountPerUnit:new Prisma.Decimal(d.amountPerUnit),isMandatory:d.isMandatory??false,startsAt:d.startsAt?new Date(d.startsAt):null,endsAt:d.endsAt?new Date(d.endsAt):null}});const units=await tx.unit.findMany({where:{tenantId:c.tenantId,communityId:c.communityId,isActive:true},select:{id:true}});await tx.contribution.createMany({data:units.map(u=>({tenantId:c.tenantId,communityId:c.communityId,campaignId:cp.id,unitId:u.id,expectedAmount:new Prisma.Decimal(d.amountPerUnit)})),skipDuplicates:true});return cp;});
  return{success:true,data:campaign};
 }
}
