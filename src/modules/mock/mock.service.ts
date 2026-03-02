import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Resource } from '../resource/entities/resource.entity';

@Injectable()
export class MockService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  async getMockData(projectNanoId: string, resourceName: string): Promise<any> {
    // 1. Ищем проект по короткому ID
    const project = await this.projectRepository.findOne({
      where: { nanoId: projectNanoId },
    });

    if (!project) {
      throw new NotFoundException(`Проект с ID '${projectNanoId}' не найден`);
    }

    // 2. Ищем ресурс (эндпоинт) по имени, привязанный к этому проекту
    const resource = await this.resourceRepository.findOne({
      where: {
        name: resourceName,
        project: { id: project.id },
      },
    });

    if (!resource) {
      throw new NotFoundException(
        `Эндпоинт '/${resourceName}' не найден в этом проекте`,
      );
    }

    // 3. Отдаем моковые данные. Если их пока нет, отдаем пустой массив
    return resource.data || [];
  }
}
