import { Controller } from '@nestjs/common';
import { UsersService } from '../services/user.service';

@Controller('/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
}
