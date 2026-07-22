import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/openapi';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = createOpenApiDocument(app);

  const targets = [
    resolve(process.cwd(), 'openapi.json'),
    resolve(process.cwd(), '../frontend/src/api/openapi.json'),
  ];

  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  }

  await app.close();
  console.log(`OpenAPI written to ${targets.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
