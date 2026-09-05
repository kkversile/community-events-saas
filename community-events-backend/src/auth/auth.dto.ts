import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
export class ChangePasswordDto {
  @IsString() @MinLength(8) newPassword: string;
}

export class LoginDto {
  @IsString() @Length(2, 20) communityCode: string;
  @IsString() @Matches(/^\d{10,15}$/) mobile: string;
  @IsString() @MinLength(6) password: string;
}

export class RegisterDto {
  @IsString() @Length(2, 20) communityCode: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]+$/) buildingCode: string;
  @IsString() @Length(1, 20) unitNumber: string;
  @IsString() @Length(1, 80) firstName: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsString() @Matches(/^\d{10,15}$/) mobile: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class ForgotPasswordDto {
  @IsString() @Length(2, 20) communityCode: string;
  @IsString() @Matches(/^\d{10,15}$/) mobile: string;
}

export class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}
