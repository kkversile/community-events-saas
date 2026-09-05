import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';
export class CreateUnitDto { @IsUUID() buildingId: string; @IsString() @Length(1,20) unitNumber: string; @IsOptional() @IsString() floor?: string; @IsOptional() @IsString() unitType?: string; }
export class UpdateUnitDto { @IsOptional() @IsString() floor?: string; @IsOptional() @IsString() unitType?: string; @IsOptional() @IsBoolean() isActive?: boolean; }
