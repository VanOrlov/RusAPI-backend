import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestApplicationOptions } from '@nestjs/common';

import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const config: NestApplicationOptions = {
    cors: {
      origin: true, // /https?:\//,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      //preflightContinue: false,
      //optionsSuccessStatus: 204,
      credentials: true,
    },
  };

  // config.httpsOptions = {
  //   key: fs.readFileSync('./localhost-key.pem'),
  //   cert: fs.readFileSync('./localhost.pem'),
  // };

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    config,
  );
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();