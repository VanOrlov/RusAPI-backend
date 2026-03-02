import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockService } from './mock.service';
import { MockController } from './mock.controller';
import { Project } from '../project/entities/project.entity';
import { Resource } from '../resource/entities/resource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Resource])], // Подключаем таблицы
  controllers: [MockController],
  providers: [MockService],
})
export class MockModule {}
