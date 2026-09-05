import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequestContext } from '../types/request-context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing access token');
    try {
      const payload = this.jwt.verify(auth.slice(7), { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      req.userContext = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        communityId: payload.communityId,
        roles: payload.roles ?? [],
        unitId: payload.unitId,
      } satisfies RequestContext;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
