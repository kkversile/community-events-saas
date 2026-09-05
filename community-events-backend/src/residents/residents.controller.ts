import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../common/security/password';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentContext } from '../common/decorators/current-context.decorator'; import { Roles } from '../common/decorators/roles.decorator'; import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { RequestContext } from '../common/types/request-context'; import { CreateResidentDto, ImportResidentsDto, UpdateResidentDto } from './residents.dto';
@Controller('residents') @UseGuards(JwtAuthGuard, RolesGuard)
export class ResidentsController { constructor(private prisma:PrismaService){}
  @Get() @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.TREASURER,PlatformRole.EVENT_ADMIN,PlatformRole.SUPER_ADMIN)
  async list(@CurrentContext() ctx:RequestContext,@Query('q') q?:string){ return {success:true,data:await this.prisma.user.findMany({ where:{tenantId:ctx.tenantId,roles:{some:{communityId:ctx.communityId,role:PlatformRole.RESIDENT}}, ...(q?{OR:[{firstName:{contains:q,mode:'insensitive'}},{mobile:{contains:q}}]}:{})}, include:{roles:{where:{communityId:ctx.communityId}},memberships:{where:{communityId:ctx.communityId,endsAt:null},include:{unit:{include:{building:true}}}}}, orderBy:{firstName:'asc'} })}; }

  @Post('import') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.SUPER_ADMIN)
  async importResidents(@CurrentContext() ctx:RequestContext,@Body() dto:ImportResidentsDto){
    const errors:Array<{row:number;message:string}> = [];
    const resolved:Array<{row:number;unitId:string;data:any}> = [];
    const seenMobiles = new Set<string>();
    for(let i=0;i<dto.rows.length;i++){
      const row=dto.rows[i]; const rowNo=i+2;
      if(seenMobiles.has(row.mobile)){errors.push({row:rowNo,message:`Duplicate mobile ${row.mobile} inside import`});continue;}
      seenMobiles.add(row.mobile);
      const building=await this.prisma.building.findFirst({where:{tenantId:ctx.tenantId,communityId:ctx.communityId,code:row.buildingCode.toUpperCase(),isActive:true}});
      if(!building){errors.push({row:rowNo,message:`Unknown building ${row.buildingCode}`});continue;}
      const unit=await this.prisma.unit.findFirst({where:{tenantId:ctx.tenantId,communityId:ctx.communityId,buildingId:building.id,unitNumber:row.unitNumber,isActive:true}});
      if(!unit){errors.push({row:rowNo,message:`Unknown flat ${row.buildingCode}-${row.unitNumber}`});continue;}
      const primary=await this.prisma.unitMembership.findFirst({where:{unitId:unit.id,isPrimary:true,endsAt:null}});
      if(primary){errors.push({row:rowNo,message:`${row.buildingCode}-${row.unitNumber} already has a primary resident`});continue;}
      resolved.push({row:rowNo,unitId:unit.id,data:row});
    }
    if(errors.length || dto.dryRun){return{success:true,data:{dryRun:!!dto.dryRun,total:dto.rows.length,valid:resolved.length,errors,readyToImport:errors.length===0}};}
    const credentials=[];
    for(const item of resolved){
      const result=await this.create(ctx,{firstName:item.data.firstName,lastName:item.data.lastName,mobile:item.data.mobile,email:item.data.email,unitId:item.unitId,membershipRole:'PRIMARY_RESIDENT'} as CreateResidentDto);
      credentials.push({row:item.row,buildingCode:item.data.buildingCode,unitNumber:item.data.unitNumber,mobile:item.data.mobile,temporaryPassword:(result as any).data.temporaryPassword});
    }
    return{success:true,data:{dryRun:false,total:dto.rows.length,imported:credentials.length,errors:[],credentials}};
  }

  @Post() @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.SUPER_ADMIN)
  async create(@CurrentContext() ctx:RequestContext,@Body() dto:CreateResidentDto){
    const unit=await this.prisma.unit.findFirstOrThrow({where:{id:dto.unitId,tenantId:ctx.tenantId,communityId:ctx.communityId}});
    const existing=await this.prisma.user.findFirst({where:{tenantId:ctx.tenantId,mobile:dto.mobile}});
    if(dto.membershipRole==='PRIMARY_RESIDENT'){const primary=await this.prisma.unitMembership.findFirst({where:{unitId:unit.id,isPrimary:true,endsAt:null,...(existing?{NOT:{userId:existing.id}}:{})}});if(primary)throw new BadRequestException('This flat already has an active primary resident. Add the person as OWNER, TENANT or FAMILY_MEMBER, or end the existing occupancy first.');}
    const temporaryPassword=existing?.passwordHash?undefined:`R-${randomBytes(5).toString('hex')}`;
    const newPasswordHash=temporaryPassword?await hashPassword(temporaryPassword):undefined;
    const user= existing
      ? await this.prisma.user.update({where:{id:existing.id},data:{firstName:dto.firstName,lastName:dto.lastName,email:dto.email,status:UserStatus.ACTIVE,...(!existing.passwordHash&&newPasswordHash?{passwordHash:newPasswordHash,mustChangePassword:true}:{})}})
      : await this.prisma.user.create({data:{tenantId:ctx.tenantId,firstName:dto.firstName,lastName:dto.lastName,mobile:dto.mobile,email:dto.email,status:UserStatus.ACTIVE,passwordHash:newPasswordHash!,mustChangePassword:true}});
    await this.prisma.$transaction([
      this.prisma.userCommunityRole.upsert({where:{communityId_userId_role:{communityId:ctx.communityId,userId:user.id,role:PlatformRole.RESIDENT}},update:{},create:{tenantId:ctx.tenantId,communityId:ctx.communityId,userId:user.id,role:PlatformRole.RESIDENT}}),
      this.prisma.unitMembership.upsert({where:{unitId_userId:{unitId:unit.id,userId:user.id}},update:{role:dto.membershipRole,endsAt:null,isPrimary:dto.membershipRole==='PRIMARY_RESIDENT'},create:{tenantId:ctx.tenantId,communityId:ctx.communityId,unitId:unit.id,userId:user.id,role:dto.membershipRole,isPrimary:dto.membershipRole==='PRIMARY_RESIDENT'}})
    ]);
    return {success:true,data:{...user,temporaryPassword}};
  }
  @Post(':id/reset-password') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.SUPER_ADMIN)
  async resetPassword(@CurrentContext() ctx:RequestContext,@Param('id') id:string){
    const user=await this.prisma.user.findFirstOrThrow({where:{id,tenantId:ctx.tenantId,roles:{some:{communityId:ctx.communityId,role:PlatformRole.RESIDENT}}}});
    const temporaryPassword=`R-${randomBytes(5).toString('hex')}`;
    await this.prisma.user.update({where:{id:user.id},data:{passwordHash:await hashPassword(temporaryPassword),mustChangePassword:true}});
    return {success:true,data:{mobile:user.mobile,temporaryPassword,whatsappMessage:`CommunityHub password reset. Mobile: ${user.mobile}. Temporary password: ${temporaryPassword}. Please change it after signing in.`}};
  }
  @Patch(':id') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.SUPER_ADMIN)
  async update(@CurrentContext() ctx:RequestContext,@Param('id') id:string,@Body() dto:UpdateResidentDto){ const row=await this.prisma.user.findFirstOrThrow({where:{id,tenantId:ctx.tenantId,roles:{some:{communityId:ctx.communityId,role:PlatformRole.RESIDENT}}}}); if(dto.mobile&&dto.mobile!==row.mobile){const duplicate=await this.prisma.user.findFirst({where:{tenantId:ctx.tenantId,mobile:dto.mobile,NOT:{id:row.id}}});if(duplicate)throw new BadRequestException('This mobile number is already registered');} const {password,...profile}=dto; return {success:true,data:await this.prisma.user.update({where:{id:row.id},data:{...profile,...(password?{passwordHash:await hashPassword(password),mustChangePassword:false}: {})}})}; }
}
