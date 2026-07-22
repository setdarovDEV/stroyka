import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Stroyka API')
    .setDescription('Construction control API for demo and desktop clients')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}
