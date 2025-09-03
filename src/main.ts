import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Authorization'],
    }),
  );
  // app.use(
  //   cors({
  //     origin: true,
  //     credentials: true,
  //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //     preflightContinue: false,
  //     optionsSuccessStatus: 204,
  //   }),
  // );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
