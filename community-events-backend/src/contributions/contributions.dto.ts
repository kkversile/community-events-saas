import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';
export class CreateCampaignDto {
  @IsString() @Length(2,150) name:string;
  @Type(()=>Number) @IsNumber({maxDecimalPlaces:2}) @IsPositive() amountPerUnit:number;
  @IsOptional() @IsBoolean() isMandatory?:boolean;
  @IsOptional() @IsDateString() startsAt?:string;
  @IsOptional() @IsDateString() endsAt?:string;
}
