import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.headers?.['x-request-id'] ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Unexpected server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      message = typeof body === 'string' ? body : body?.message ?? exception.message;
      const candidate = Array.isArray(message) ? undefined : String(message);
      code = candidate && /^[A-Z0-9_]+$/.test(candidate) ? candidate : `HTTP_${status}`;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
        message = 'A record with the same unique value already exists.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'RECORD_NOT_FOUND';
        message = 'The requested record was not found.';
      }
    }

    if (status >= 500) {
      console.error(`[${requestId}]`, exception);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
      meta: { requestId },
    });
  }
}
