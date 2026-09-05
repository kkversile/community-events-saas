import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentContext } from '../common/decorators/current-context.decorator';
import { RequestContext } from '../common/types/request-context';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return { success: true, data: await this.auth.login(dto) };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) { return { success: true, data: await this.auth.register(dto) }; }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) { return { success: true, data: await this.auth.forgotPassword(dto) }; }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) { return { success: true, data: await this.auth.resetPassword(dto) }; }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentContext() ctx: RequestContext, @Body() dto: ChangePasswordDto) {
    return { success: true, data: await this.auth.changePassword(ctx.userId, dto.newPassword) };
  }
}
