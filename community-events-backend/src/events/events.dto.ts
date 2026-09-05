import { IsDateString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
export class CreateEventDto {
  @IsOptional() @IsUUID() eventTypeId?: string;
  @IsString() @Length(2,150) name:string;
  @IsOptional() @IsString() @MaxLength(2000) description?:string;
  @IsDateString() startDate:string;
  @IsDateString() endDate:string;
  @IsOptional() @IsDateString() registrationOpenAt?:string;
  @IsOptional() @IsDateString() registrationCloseAt?:string;
}
export class UpdateEventDto {
  @IsOptional() @IsString() @Length(2,150) name?:string;
  @IsOptional() @IsString() @MaxLength(2000) description?:string;
  @IsOptional() @IsDateString() startDate?:string;
  @IsOptional() @IsDateString() endDate?:string;
  @IsOptional() @IsDateString() registrationOpenAt?:string;
  @IsOptional() @IsDateString() registrationCloseAt?:string;
}
