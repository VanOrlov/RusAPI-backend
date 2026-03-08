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
    body: Record<string, unknown>,
  ) {
    this.validateBodyStructure(body);

    const resource = await this.getResourceOrThrow(nanoId, resourceName);

    if (resource.data && resource.data.length >= 100) {
      throw new BadRequestException(
        'Превышен лимит: в эндпоинте не может быть больше 100 записей.',
      );
    }

    const schemaFields = resource.schema || [];
    const sanitizedItem = this.sanitizeAndValidatePayload(
      schemaFields,
      body,
      true,
    );

    resource.data.unshift(sanitizedItem);
    await this.resourceRepository.save(resource);

    return sanitizedItem;
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

  /**
   * Определяет ожидаемый базовый тип данных JavaScript на основе типа генератора Faker.js.
   * Эта функция помогает маппить специфичные типы Faker (например, 'internet.email' или 'number.int')
   * на стандартные примитивы для валидации входящих JSON-запросов.
   *
   * @param {string} fakerType - Строка с типом генератора из Faker.js (например, 'date.past', 'person.firstName').
   * @returns {string} Строковое представление типа ('string', 'number', 'boolean' или 'array').
   */
  private getExpectedJsType(fakerType: string): string {
    if (!fakerType) return 'string';

    const [category, method] = fakerType.split('.');

    if (category === 'number') return 'number';

    if (category === 'datatype' && method === 'boolean') return 'boolean';

    if (method && method.toLowerCase().includes('array')) return 'array';

    if (category === 'date') return 'string';

    return 'string';
  }

  /**
   * Проверяет базовую структуру входящего тела запроса.
   * Убеждается, что клиент прислал валидный, непустой JSON-объект.
   *
   * @param {Record<string, unknown>} body - Входящее тело запроса от клиента.
   * @throws {BadRequestException} Если body пустое, является массивом, null или не имеет ключей.
   */
  private validateBodyStructure(body: Record<string, unknown>): void {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      throw new BadRequestException(
        'Тело запроса (body) должно быть непустым JSON-объектом.',
      );
    }
  }

  /**
   * Пропускает входящие данные через "сито" схемы ресурса.
   * Отбрасывает незаявленные поля, заполняет недостающие поля значением `null`
   * и выполняет строгую проверку типов для переданных значений.
   *
   * @param {Resource['schema']} schemaFields - Массив конфигураций полей из схемы БД.
   * @param {Record<string, unknown>} body - Данные, присланные клиентом.
   * @param {boolean} isCreate - Флаг создания. Если true, принудительно генерирует новый UUID для поля 'id'.
   * @returns {Resource['data'][number]} Очищенный и провалидированный объект, полностью соответствующий схеме.
   * @throws {BadRequestException} Если тип переданного значения не совпадает с ожидаемым типом из схемы.
   */
  private sanitizeAndValidatePayload(
    schemaFields: Resource['schema'],
    body: Record<string, unknown>,
    isCreate: boolean,
  ): Resource['data'][number] {
    const sanitizedItem: Record<string, any> = {};

    if (isCreate) {
      sanitizedItem['id'] = uuidv4();
    }

    for (const field of schemaFields) {
      const fieldName = field.name;

      if (fieldName === 'id') {
        continue;
      }

      const clientValue = body[fieldName];

      if (clientValue === undefined) {
        sanitizedItem[fieldName] = null;
        continue;
      }

      if (clientValue !== null) {
        const expectedType = this.getExpectedJsType(field.type);
        const actualType = Array.isArray(clientValue)
          ? 'array'
          : typeof clientValue;

        if (actualType !== expectedType) {
          throw new BadRequestException(
            `Ошибка валидации: Поле '${fieldName}' ожидает тип '${expectedType}', но получено '${actualType}'.`,
          );
        }

        if (field.type.startsWith('date.')) {
          const isDateValid = !isNaN(Date.parse(clientValue as string));

          if (!isDateValid) {
            throw new BadRequestException(
              `Ошибка валидации: Поле '${fieldName}' должно быть валидной датой (ISO 8601), получено: ${JSON.stringify(clientValue)}.`,
            );
          }
        }
      }

      sanitizedItem[fieldName] = clientValue;
    }

    return sanitizedItem as Resource['data'][number];
  }
}
