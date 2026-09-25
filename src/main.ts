import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      instrument: ObserveInstrument,
    },
  );
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
