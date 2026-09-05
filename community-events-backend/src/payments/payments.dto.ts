import { Type } from 'class-transformer'; import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'; import { PaymentMode } from '@prisma/client';
export class CreatePaymentDto { @Type(()=>Number) @IsNumber({maxDecimalPlaces:2}) @IsPositive() amount:number; @IsEnum(PaymentMode) mode:PaymentMode; @IsOptional() @IsString() @MaxLength(100) transactionRef?:string; @IsOptional() @IsString() @MaxLength(500) remarks?:string; }
export class RejectPaymentDto { @IsString() @MaxLength(500) reason:string; }
