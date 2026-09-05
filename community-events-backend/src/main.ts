import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use((req: any, res: any, next: any) => {
    const requestId = String(req.headers['x-request-id'] ?? randomUUID());
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      console.log(JSON.stringify({ requestId, method: req.method, path: req.originalUrl, statusCode: res.statusCode, durationMs: Math.round(durationMs * 10) / 10 }));
    });
    next();
  });
  const configuredOrigins = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:3004')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = [
    ...configuredOrigins,
    'https://community-saas-care1dn3v-dvi-softs-projects.vercel.app',
    'https://community-events-saas-community-events-backend-g5bfnmfza.vercel.app',
  ];
  app.enableCors({ origin: [...new Set(allowedOrigins)], credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  const swaggerConfig = new DocumentBuilder().setTitle('Community Events API').setVersion('1.0').addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  const port = Number(config.get('PORT') ?? 4004);
  await app.listen(port, '0.0.0.0');
  console.log(`Community Events API running on http://localhost:${port}/api/v1`);
}
bootstrap();
