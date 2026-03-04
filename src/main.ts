import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestApplicationOptions } from '@nestjs/common';

import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors((req: Request, callback) => {
    let corsOptions;
    if (req.url.includes('/api/mock')) {
      corsOptions = {
        origin: true,
        credentials: false,
      };
    } else {
      corsOptions = {
        origin: process.env.FRONTEND_URL || 'http://localhost:9000',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
      };
    }

    // Возвращаем примененные настройки
    callback(null, corsOptions);
  });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
