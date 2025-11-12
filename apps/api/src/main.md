import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS (allow Vite, etc)
  app.enableCors({
    origin: [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Validation (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Tasks API')
    .setDescription('JWT-protected RBAC Task Management API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3333);
  await app.listen(port);
  const url = await app.getUrl();
  // eslint-disable-next-line no-console
  console.log(`[api] listening on ${url} | Swagger: ${url}/api`);
}

bootstrap();
