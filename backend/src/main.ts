import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { Express, Request, Response } from 'express';
import { createOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const openApiDocument = createOpenApiDocument(app);
  const express = app.getHttpAdapter().getInstance() as Express;
  express.get('/openapi.json', (_request: Request, response: Response) => response.json(openApiDocument));
  try {
    const { apiReference } = await Function('specifier', 'return import(specifier)')('@scalar/nestjs-api-reference');
    app.use(
      '/reference',
      apiReference({
        theme: 'kepler',
        spec: { content: openApiDocument },
      }),
    );
  } catch (error) {
    console.warn('API reference disabled:', error instanceof Error ? error.message : error);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`API reference running on http://localhost:${port}/reference`);
}
bootstrap();
