import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; import { RequestContext } from '../common/types/request-context'; import { CreateEventDto, UpdateEventDto } from './events.dto';
@Injectable()
export class EventsService { constructor(private prisma:PrismaService){}
  private slugify(v:string){ return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
  async list(ctx:RequestContext){ return this.prisma.event.findMany({where:{tenantId:ctx.tenantId,communityId:ctx.communityId},include:{eventType:true,_count:{select:{sessions:true,bookings:true}}},orderBy:{startDate:'desc'}}); }
  async create(ctx:RequestContext,dto:CreateEventDto){
    const start=new Date(dto.startDate),end=new Date(dto.endDate); if(end<start) throw new BadRequestException('End date must be on or after start date');
    let base=this.slugify(dto.name),slug=base,i=2; while(await this.prisma.event.findFirst({where:{communityId:ctx.communityId,slug}})){slug=`${base}-${i++}`;}
    return this.prisma.event.create({data:{tenantId:ctx.tenantId,communityId:ctx.communityId,eventTypeId:dto.eventTypeId,name:dto.name.trim(),slug,description:dto.description?.trim(),startDate:start,endDate:end,registrationOpenAt:dto.registrationOpenAt?new Date(dto.registrationOpenAt):null,registrationCloseAt:dto.registrationCloseAt?new Date(dto.registrationCloseAt):null}});
  }
  async one(ctx:RequestContext,id:string){ const row=await this.prisma.event.findFirst({where:{id,tenantId:ctx.tenantId,communityId:ctx.communityId},include:{eventType:true,sessions:{orderBy:{sessionDate:'asc'}},campaigns:true,expenses:{include:{category:true}}}}); if(!row)throw new NotFoundException('Event not found'); return row; }
  async update(ctx:RequestContext,id:string,dto:UpdateEventDto){ const row=await this.one(ctx,id); const start=dto.startDate?new Date(dto.startDate):row.startDate,end=dto.endDate?new Date(dto.endDate):row.endDate;if(end<start)throw new BadRequestException('End date must be on or after start date'); return this.prisma.event.update({where:{id:row.id},data:{name:dto.name?.trim(),description:dto.description?.trim(),startDate:start,endDate:end,registrationOpenAt:dto.registrationOpenAt?new Date(dto.registrationOpenAt):undefined,registrationCloseAt:dto.registrationCloseAt?new Date(dto.registrationCloseAt):undefined}}); }
  async publish(ctx:RequestContext,id:string){ const row=await this.one(ctx,id); if(row.status!=='DRAFT')throw new BadRequestException('Only draft events can be published'); if(!row.sessions.length)throw new BadRequestException('Create at least one session before publishing'); return this.prisma.event.update({where:{id},data:{status:'PUBLISHED'}}); }

  async participation(ctx:RequestContext,id:string){
    await this.one(ctx,id);
    const sessions=await this.prisma.eventSession.findMany({
      where:{eventId:id,tenantId:ctx.tenantId,communityId:ctx.communityId},
      include:{
        bookings:{where:{status:'CONFIRMED'},include:{unit:{include:{building:true}},user:true},orderBy:{bookedAt:'asc'}},
        waitlist:{where:{cancelledAt:null,promotedAt:null},include:{unit:{include:{building:true}},user:true},orderBy:{position:'asc'}},
      },
      orderBy:{sessionDate:'asc'},
    });
    return sessions.map(s=>({
      id:s.id,name:s.name,sessionDate:s.sessionDate,startTime:s.startTime,endTime:s.endTime,capacity:s.capacity,
      bookings:s.bookings.map(b=>({id:b.id,unit:`${b.unit.building.code}-${b.unit.unitNumber}`,resident:`${b.user.firstName}${b.user.lastName?` ${b.user.lastName}`:''}`,adults:b.adults,children:b.children,seniors:b.seniors,bookedAt:b.bookedAt})),
      waitlist:s.waitlist.map(w=>({id:w.id,position:w.position,unit:`${w.unit.building.code}-${w.unit.unitNumber}`,resident:`${w.user.firstName}${w.user.lastName?` ${w.user.lastName}`:''}`})),
    }));
  }

  async residentView(ctx:RequestContext,id:string){
    if(!ctx.unitId)throw new BadRequestException('No active flat is linked to this login');
    const event=await this.prisma.event.findFirst({where:{id,tenantId:ctx.tenantId,communityId:ctx.communityId},include:{sessions:{where:{isActive:true},orderBy:{sessionDate:'asc'},include:{_count:{select:{bookings:{where:{status:'CONFIRMED'}},waitlist:{where:{cancelledAt:null,promotedAt:null}}}}}},campaigns:{include:{contributions:{where:{unitId:ctx.unitId},include:{payments:{orderBy:{createdAt:'desc'}}}}}},bookings:{where:{unitId:ctx.unitId,status:'CONFIRMED'},include:{session:true}},waitlist:{where:{unitId:ctx.unitId,cancelledAt:null,promotedAt:null},include:{session:true},orderBy:{position:'asc'}}}});
    if(!event)throw new NotFoundException('Event not found');
    return {event:{id:event.id,name:event.name,description:event.description,startDate:event.startDate,endDate:event.endDate,status:event.status},booking:event.bookings[0]??null,waitlist:event.waitlist[0]??null,contribution:event.campaigns[0]?.contributions[0]??null,sessions:event.sessions.map(s=>({id:s.id,name:s.name,date:s.sessionDate,startTime:s.startTime,endTime:s.endTime,capacity:s.capacity,booked:s._count.bookings,waitlist:s._count.waitlist,remaining:s.capacity==null?null:Math.max(0,s.capacity-s._count.bookings),status:s.capacity!=null&&s._count.bookings>=s.capacity?'FULL':'AVAILABLE',allowWaitlist:s.allowWaitlist}))};
  }
}
