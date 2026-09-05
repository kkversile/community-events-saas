import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
export class CreateBuildingDto {
  @IsString() @Length(1, 80) name: string;
  @IsString() @Length(1, 20) code: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateBuildingDto {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
