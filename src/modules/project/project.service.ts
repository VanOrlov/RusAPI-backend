import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nanoid } from 'nanoid';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    // Генерируем красивый ID длиной 10 символов (например: "V1StGXR8_Z")
    const shortId = nanoid(10);

    const newProject = this.projectRepository.create({
      ...dto,
      nanoId: shortId,
      // Вот тут мы связываем проект с конкретным юзером!
      // TypeORM достаточно передать объект с id, чтобы он понял, как построить связь.
      user: { id: userId },
    });

    return await this.projectRepository.save(newProject);
  }

  // Заодно сразу напишем метод получения всех проектов юзера (пригодится для дашборда)
  async findAllByUser(userId: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }, // Свежие проекты сверху
    });
  }

  async findOne(projectNanoId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: {
        nanoId: projectNanoId,
        user: { id: userId },
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Проект не найден или у вас нет к нему доступа',
      );
    }

    return project;
  }
}
