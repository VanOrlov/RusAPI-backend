import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Resource } from '../resource/entities/resource.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  // Приватный метод (DRY), чтобы не писать этот код в каждом запросе
  private async getResourceOrThrow(
    projectNanoId: string,
    resourceName: string,
  ): Promise<Resource> {
    const project = await this.projectRepository.findOne({
      where: { nanoId: projectNanoId },
    });

    if (!project) {
      throw new NotFoundException(`Проект с ID '${projectNanoId}' не найден`);
    }

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

    // Защита от null, если данные еще не генерировались
    if (!resource.data) {
      resource.data = [];
    }

    return resource;
  }

  async getAll(nanoId: string, resourceName: string) {
    const resource = await this.getResourceOrThrow(nanoId, resourceName);
    return resource.data;
  }

  async getOne(nanoId: string, resourceName: string, id: string) {
    const resource = await this.getResourceOrThrow(nanoId, resourceName);
    const item = resource.data.find((el: any) => el.id === id);

    if (!item) {
      throw new NotFoundException(`Объект с id '${id}' не найден`);
    }
    return item;
  }

  async create(
    nanoId: string,
    resourceName: string,
    body: Record<string, any>,
  ) {
    const resource = await this.getResourceOrThrow(nanoId, resourceName);

    if (resource.data.length >= 100) {
      throw new BadRequestException(
        'Достигнут лимит: в одном эндпоинте не может быть больше 100 записей.',
      );
    }

    const newItem = { id: uuidv4(), ...body };

    resource.data.unshift(newItem);

    // Сохраняем в БД
    await this.resourceRepository.save(resource);

    return newItem;
  }

  async update(
    nanoId: string,
    resourceName: string,
    id: string,
    body: Record<string, any>,
  ) {
    const resource = await this.getResourceOrThrow(nanoId, resourceName);
    const index = resource.data.findIndex((el: any) => el.id === id);

    if (index === -1) {
      throw new NotFoundException(`Объект с id '${id}' не найден`);
    }

    resource.data[index] = { ...resource.data[index], ...body, id };

    await this.resourceRepository.save(resource);

    return resource.data[index];
  }

  async remove(nanoId: string, resourceName: string, id: string) {
    const resource = await this.getResourceOrThrow(nanoId, resourceName);
    const initialLength = resource.data.length;

    resource.data = resource.data.filter((el: any) => el.id !== id);

    if (resource.data.length === initialLength) {
      throw new NotFoundException(`Объект с id '${id}' не найден`);
    }

    await this.resourceRepository.save(resource);
    return { success: true };
  }
}
