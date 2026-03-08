import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MockService } from './mock.service';
import { Throttle } from '@nestjs/throttler';

@Controller('mock')
export class MockController {
  constructor(private readonly mockService: MockService) {}

  @Throttle({
    short: { limit: 5, ttl: 1000 },
  })
  @Get(':nanoId/:resourceName')
  async getResource(
    @Param('nanoId') nanoId: string,
    @Param('resourceName') resourceName: string,
  ) {
    return await this.mockService.getAll(nanoId, resourceName);
  }

  @Throttle({
    short: { limit: 5, ttl: 1000 },
  })
  @Get(':nanoId/:resourceName/:id')
  async getOneResource(
    @Param('nanoId') nanoId: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
  ) {
    return await this.mockService.getOne(nanoId, resourceName, id);
  }

  @Throttle({
    short: { limit: 5, ttl: 1000 },
  })
  @Post(':nanoId/:resourceName/')
  async create(
    @Param('nanoId') nanoId: string,
    @Param('resourceName') resourceName: string,
    @Body() body: Record<string, unknown>,
  ) {
    return await this.mockService.create(nanoId, resourceName, body);
  }
}
