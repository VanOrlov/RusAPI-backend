import { Controller, Get, Param } from '@nestjs/common';
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
    return await this.mockService.getMockData(nanoId, resourceName);
  }
}
