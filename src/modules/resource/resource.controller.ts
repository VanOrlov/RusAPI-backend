import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { AuthGuard } from '@nestjs/passport';
import { type AuthRequest } from '../auth/dto/auth-request';
import { UpdateSchemaDto } from './dto/update-schema.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateResourceDto) {
    const userId = req.user.id;
    return await this.resourceService.create(userId, dto);
  }

  // Получить все ресурсы конкретного проекта (для сайдбара)
  @Get('project/:nanoId')
  async findAllByProject(
    @Req() req: AuthRequest,
    @Param('nanoId') nanoId: string,
  ) {
    const userId = req.user.id;
    return await this.resourceService.findAllByProject(nanoId, userId);
  }

  // НОВЫЙ РОУТ ДЛЯ ОБНОВЛЕНИЯ СХЕМЫ
  @Patch(':id/schema')
  async updateSchema(
    @Req() req: AuthRequest,
    @Param('id') resourceId: string,
    @Body() dto: UpdateSchemaDto,
  ) {
    const userId = req.user.id;
    return await this.resourceService.updateSchema(resourceId, userId, dto);
  }

  @Post(':id/generate')
  async generateData(
    @Req() req: AuthRequest,
    @Param('id') resourceId: string,
    // Позволим фронтенду передавать количество через query параметр (например, ?count=20)
    @Query('count') count?: string,
  ) {
    const userId = req.user.id;
    // Если count не передали, по умолчанию сгенерируем 10
    const recordsCount = count ? parseInt(count, 10) : 10;

    return await this.resourceService.generateData(
      resourceId,
      userId,
      recordsCount,
    );
  }
}
