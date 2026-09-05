import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../types/request-context';

export const CurrentContext = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestContext => {
  const req = ctx.switchToHttp().getRequest();
  return req.userContext;
});
