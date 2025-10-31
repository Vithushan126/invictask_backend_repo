// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import cors from 'cors';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.setGlobalPrefix('api/v1');

//   app.use(
//     cors({
//       origin: true,
//       credentials: true,
//       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//       allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//       exposedHeaders: ['Authorization'],
//     }),
//   );

//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable and configure CORS
  app.use(
    cors({
      origin: true, // or specific domains like ['https://your-frontend.com']
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Authorization'],
    }),
  );

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown fields automatically
      forbidNonWhitelisted: false, // Throw error on unknown fields
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Enable WebSocket (for real-time task updates or notifications)
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
