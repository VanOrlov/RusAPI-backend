import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from 'config/configuration';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResourceModule } from './modules/resource/resource.module';
import { ProjectModule } from './modules/project/project.module';
import { MockModule } from './modules/mock/mock.module';

@Module({
  imports: [
    // 1️⃣ Подключаем ConfigModule
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
    UserModule,
    AuthModule,
    ProjectModule,
    ResourceModule,
    MockModule,
  ],
})
export class AppModule {}
