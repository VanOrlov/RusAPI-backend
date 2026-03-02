import {
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

    // 3. Создаем новый ресурс
    const newResource = this.resourceRepository.create({
      name: dto.name,
      schema: [], // По умолчанию схема пустая (настроим позже в конструкторе)
      data: [], // Данные тоже пустые
      project: { id: project.id }, // Привязываем к внутреннему UUID проекта
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
    // 1. Ищем ресурс и подтягиваем его проект и владельца проекта
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['project', 'project.user'], // Магия TypeORM для проверки прав
    });

    if (!resource) {
      throw new NotFoundException('Эндпоинт не найден');
    }

    // 2. Строгая проверка безопасности
    if (resource.project.user.id !== userId) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этого эндпоинта',
      );
    }

    // 3. Обновляем схему
    resource.schema = dto.schema;

    // 4. Сохраняем и возвращаем обновленный ресурс
    return await this.resourceRepository.save(resource);
  }
}
