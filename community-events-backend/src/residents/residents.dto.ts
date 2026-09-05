import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class CreateResidentDto {
  @IsString() @Length(1,80) firstName:string;
  @IsOptional() @IsString() @Length(1,80) lastName?:string;
  @IsString() @Matches(/^\d{10,15}$/) mobile:string;
  @IsOptional() @IsEmail() email?:string;
  @IsUUID() unitId:string;
  @IsEnum(MembershipRole) membershipRole:MembershipRole;
}

export class UpdateResidentDto {
  @IsOptional() @IsString() @Length(1,80) firstName?:string;
  @IsOptional() @IsString() @Length(1,80) lastName?:string;
  @IsOptional() @IsString() @Matches(/^\d{10,15}$/) mobile?:string;
  @IsOptional() @IsEmail() email?:string;
  @IsOptional() @IsString() @Length(8,128) password?:string;
}

export class ImportResidentRowDto {
  @IsString() @Length(1, 20) buildingCode: string;
  @IsString() @Length(1, 20) unitNumber: string;
  @IsString() @Length(1, 80) firstName: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsString() @Matches(/^\d{10,15}$/) mobile: string;
  @IsOptional() @IsEmail() email?: string;
}

export class ImportResidentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500)
  @ValidateNested({ each: true }) @Type(() => ImportResidentRowDto)
  rows: ImportResidentRowDto[];

  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}
