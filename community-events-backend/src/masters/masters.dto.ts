import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateMasterDto {
  @IsString() @Length(2, 30) code: string;
  @IsString() @Length(2, 100) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class UpdateMasterDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
