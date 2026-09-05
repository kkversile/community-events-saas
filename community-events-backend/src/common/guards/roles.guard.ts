import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const req = context.switchToHttp().getRequest();
    const roles: PlatformRole[] = req.userContext?.roles ?? [];
    if (!required.some((r) => roles.includes(r))) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
