import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class CreateBookingDto {
  @IsInt() @Min(0) @Max(30) adults:number;
  @IsInt() @Min(0) @Max(30) children:number;
  @IsInt() @Min(0) @Max(30) seniors:number;
  @IsOptional() @IsString() @MaxLength(500) notes?:string;
  @IsOptional() @IsBoolean() joinWaitlistIfFull?:boolean;
}
