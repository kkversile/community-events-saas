import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreateAnnouncementDto { @IsOptional() @IsUUID() eventId?:string; @IsString() @MaxLength(150) title:string; @IsString() @MaxLength(2000) message:string; @IsOptional() @IsBoolean() isImportant?:boolean; }
