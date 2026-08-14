import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { validarEnvObrigatorias } from './env';

const PORTA_PADRAO = 3334;

async function bootstrap(): Promise<void> {
  validarEnvObrigatorias();

  // bufferLogs segura os logs do próprio bootstrap até o pino assumir — sem isso as primeiras
  // linhas saem fora do formato estruturado.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Atrás de proxy: sem isto req.ip vira sempre o IP do proxy, e todo cliente cai no mesmo bucket
  // do rate limit — o teto de tentativas de login viraria enfeite.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(Number(process.env.API_PORT ?? PORTA_PADRAO));
}

void bootstrap();
