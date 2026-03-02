import { Controller, Get, Param } from '@nestjs/common';
import { MockService } from './mock.service';

// Обрати внимание: здесь НЕТ @UseGuards! Этот роут открыт всему интернету.
@Controller('mock')
export class MockController {
  constructor(private readonly mockService: MockService) {}

  // Перехватываем GET запросы вида /mock/Vx9_k2m/users
  @Get(':nanoId/:resourceName')
  async getResource(
    @Param('nanoId') nanoId: string,
    @Param('resourceName') resourceName: string,
  ) {
    return await this.mockService.getMockData(nanoId, resourceName);
  }
}
