import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { type AuthRequest } from '../auth/dto/auth-request';

@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const userId = req.user.id;

    return await this.projectService.create(userId, createProjectDto);
  }

  @Get()
  async findAll(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return await this.projectService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.user.id;
    return await this.projectService.findOne(id, userId);
  }
}
