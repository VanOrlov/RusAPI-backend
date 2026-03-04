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
import { GenerateDataQueryDto } from './dto/generate-data-query.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateResourceDto) {
    const userId = req.user.id;
    return await this.resourceService.create(userId, dto);
  }

  @Get('project/:nanoId')
  async findAllByProject(
    @Req() req: AuthRequest,
    @Param('nanoId') nanoId: string,
  ) {
    const userId = req.user.id;
    return await this.resourceService.findAllByProject(nanoId, userId);
  }

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
    @Query() query: GenerateDataQueryDto,
  ) {
    const userId = req.user.id;

    const recordsCount = query.count ?? 10;

    return await this.resourceService.generateData(
      resourceId,
      userId,
      recordsCount,
    );
  }
}
