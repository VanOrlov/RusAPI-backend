import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/user.service';
import { AuthGuard } from '@nestjs/passport';
import { type AuthRequest } from 'src/modules/auth/dto/auth-request';
import { UpdateUserDto } from '../dto/update-user.dto';

@Controller('/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch('update')
  async updatePassword(@Req() req: AuthRequest, @Body() body: UpdateUserDto) {
    const userId = req.user.id;

    await this.service.changeUserData(userId, body);

    return { message: 'Данные успешно изменены' };
  }
}
