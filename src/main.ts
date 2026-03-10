import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';

import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request } from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const config: NestApplicationOptions = process.env.USE_HTTPS
    ? {
        httpsOptions: {
          key: fs.readFileSync('./localhost-key.pem'),
          cert: fs.readFileSync('./localhost.pem'),
        },
      }
    : {};
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    config,
  );

  app.enableCors((req: Request, callback) => {
    const origin = req.header('Origin');
    const url = req.url;

    if (url.includes('/mock/')) {
      return callback(null, {
        origin: true,
        credentials: true,
      });
    }
    const allowedOrigin = process.env.FRONTEND_URL;

    if (!origin || origin === allowedOrigin) {
      return callback(null, {
        origin: true,
        credentials: true,
      });
    }

    // 3. Блокируем всех чужаков, которые лезут не в моки, а в админку
    return callback(new Error('Not allowed by CORS'), { origin: false });
  });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
