import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { Project } from '../project/entities/project.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { faker } from '@faker-js/faker';
import { validateDefaultIdInSchema } from './utils/validateSchema.utils';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(userId: string, dto: CreateResourceDto): Promise<Resource> {
    // 1. Ищем проект и сразу подтягиваем его владельца
    const project = await this.projectRepository.findOne({
      where: { nanoId: dto.projectNanoId },
      relations: ['user'],
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    // 2. Строгая проверка безопасности: владелец ли это?
    if (project.user.id !== userId) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этого проекта',
      );
    }

    const existingResource = await this.resourceRepository.findOne({
      where: {
        name: dto.name,
        project: { id: project.id }, // Ищем строго внутри текущего проекта
      },
    });

    if (existingResource) {
      throw new ConflictException(
        `Эндпоинт с именем "${dto.name}" уже существует в этом проекте`,
      );
    }

    const newResource = this.resourceRepository.create({
      name: dto.name,
      // Всегда добавляем id с типом uuid
      schema: [
        {
          name: 'id',
          type: 'string.uuid',
        },
      ],
      data: [],
      project: { id: project.id },
    });

    return await this.resourceRepository.save(newResource);
  }

  // Заодно добавим метод для получения всех ресурсов проекта (для сайдбара)
  async findAllByProject(
    projectNanoId: string,
    userId: string,
  ): Promise<Resource[]> {
    // Убеждаемся, что юзер имеет доступ к проекту
    const project = await this.projectRepository.findOne({
      where: { nanoId: projectNanoId, user: { id: userId } },
    });

    if (!project) throw new NotFoundException('Проект не найден');

    return await this.resourceRepository.find({
      where: { project: { id: project.id } },
      order: { createdAt: 'ASC' }, // Старые эндпоинты сверху, новые снизу
    });
  }

  async updateSchema(
    resourceId: string,
    userId: string,
    dto: UpdateSchemaDto,
  ): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['project', 'project.user'],
    });

    if (!resource) {
      throw new NotFoundException('Эндпоинт не найден');
    }

    if (resource.project.user.id !== userId) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этого эндпоинта',
      );
    }

    if (!dto.schema.length) {
      throw new BadRequestException('Нельзя оставить схему пустой');
    }

    if (dto.schema.length > 50) {
      throw new BadRequestException('Максимальное кол-во полей: 50');
    }

    const validateFirstEl = validateDefaultIdInSchema(dto.schema);
    if (!validateFirstEl)
      throw new BadRequestException('Первый элемент всегда должен быть uuid ');
    resource.schema = dto.schema;

    return await this.resourceRepository.save(resource);
  }

  async generateData(
    resourceId: string,
    userId: string,
    count: number = 10,
  ): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['project', 'project.user'],
    });

    if (!resource) {
      throw new NotFoundException('Эндпоинт не найден');
    }

    if (resource.project.user.id !== userId) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этого эндпоинта',
      );
    }

    const schema = resource.schema;
    if (!schema || schema.length === 0) {
      throw new BadRequestException('Схема пуста. Сначала добавьте поля.');
    }

    const generatedArray: Resource['data'] = [];

    for (let i = 0; i < count; i++) {
      const mockObject: Resource['data'][number] = { id: '' };

      for (const field of schema) {
        try {
          const parts = field.type.split('.');
          const category = parts[0] as keyof typeof faker;
          const method = parts[1];

          const fakerCategory = faker[category];

          if (
            fakerCategory &&
            typeof (fakerCategory as Record<string, unknown>)[method] ===
              'function'
          ) {
            const generateValue = //@ts-ignore
              (fakerCategory as Record<string, () => unknown>)[method];

            mockObject[field.name] = generateValue();
          } else {
            mockObject[field.name] = 'Неизвестный тип';
          }
        } catch {
          mockObject[field.name] = null;
        }
      }

      generatedArray.push(mockObject);
    }

    // Сохраняем сгенерированные данные в базу
    resource.data = generatedArray;
    return await this.resourceRepository.save(resource);
  }
}
