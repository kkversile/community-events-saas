import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreateExpenseDto {
  @IsUUID() eventId:string;
  @IsOptional() @IsUUID() categoryId?:string;
  @IsString() @MaxLength(250) description:string;
  @IsOptional() @IsString() @MaxLength(150) vendorName?:string;
  @Type(()=>Number) @IsNumber({maxDecimalPlaces:2}) @IsPositive() amount:number;
  @IsDateString() expenseDate:string;
  @IsOptional() @IsString() receiptUrl?:string;
}
export class UpdateExpenseDto {
  @IsOptional() @IsUUID() categoryId?:string;
  @IsOptional() @IsString() @MaxLength(250) description?:string;
  @IsOptional() @IsString() @MaxLength(150) vendorName?:string;
  @IsOptional() @Type(()=>Number) @IsNumber({maxDecimalPlaces:2}) @IsPositive() amount?:number;
  @IsOptional() @IsDateString() expenseDate?:string;
}
