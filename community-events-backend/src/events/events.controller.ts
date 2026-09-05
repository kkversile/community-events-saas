import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'; import { PlatformRole } from '@prisma/client';
import { CurrentContext } from '../common/decorators/current-context.decorator'; import { Roles } from '../common/decorators/roles.decorator'; import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { RequestContext } from '../common/types/request-context'; import { CreateEventDto,UpdateEventDto } from './events.dto'; import { EventsService } from './events.service';
@Controller('events') @UseGuards(JwtAuthGuard,RolesGuard)
export class EventsController {constructor(private svc:EventsService){}
  @Get() async list(@CurrentContext() c:RequestContext){return{success:true,data:await this.svc.list(c)}}
  @Post() @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.EVENT_ADMIN,PlatformRole.SUPER_ADMIN) async create(@CurrentContext() c:RequestContext,@Body() d:CreateEventDto){return{success:true,data:await this.svc.create(c,d)}}
  @Get(':id') async one(@CurrentContext() c:RequestContext,@Param('id') id:string){return{success:true,data:await this.svc.one(c,id)}}
  @Patch(':id') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.EVENT_ADMIN,PlatformRole.SUPER_ADMIN) async update(@CurrentContext() c:RequestContext,@Param('id') id:string,@Body() d:UpdateEventDto){return{success:true,data:await this.svc.update(c,id,d)}}
  @Post(':id/publish') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.EVENT_ADMIN,PlatformRole.SUPER_ADMIN) async publish(@CurrentContext() c:RequestContext,@Param('id') id:string){return{success:true,data:await this.svc.publish(c,id)}}
  @Get(':id/participation') @Roles(PlatformRole.COMMUNITY_ADMIN,PlatformRole.EVENT_ADMIN,PlatformRole.TREASURER,PlatformRole.SUPER_ADMIN) async participation(@CurrentContext() c:RequestContext,@Param('id') id:string){return{success:true,data:await this.svc.participation(c,id)}}
  @Get(':id/resident-view') async resident(@CurrentContext() c:RequestContext,@Param('id') id:string){return{success:true,data:await this.svc.residentView(c,id)}}
}
