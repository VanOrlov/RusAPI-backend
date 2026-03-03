import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from 'config/configuration';

// Добавили APP_GUARD для глобальной защиты
import { APP_GUARD } from '@nestjs/core';
// Добавили ThrottlerGuard
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResourceModule } from './modules/resource/resource.module';
import { ProjectModule } from './modules/project/project.module';
import { MockModule } from './modules/mock/mock.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Подключение основной БД
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('db')!,
      inject: [ConfigService],
    }),

    // Настройка Rate Limiting через Redis
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 10,
        },
        {
          name: 'default',
          ttl: 10000,
          limit: 100,
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis({
          host: 'localhost',
          port: 6379,
        }),
      ),
    }),

    UserModule,
    AuthModule,
    ProjectModule,
    ResourceModule,
    MockModule,
    RedisModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
