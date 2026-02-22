import {
  Body,
  Controller,
  Post,
  Res,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Get,
  Req,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../user/services/user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { type AuthRequest } from './dto/auth-request';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @UsePipes(new ValidationPipe())
  @Post('register')
  async register(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.register(dto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      sameSite: 'strict',
      secure: true,
    });

    return response;
  }

  @UsePipes(new ValidationPipe())
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = dto;
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль'); // Лучше не уточнять, что именно неверно
    }

    const { refreshToken, ...response } = await this.authService.login(
      user.id,
      user.email,
      user.role,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: true,
    });

    return response;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(
    @Req()
    req: AuthRequest,
  ) {
    const user = await this.usersService.findById(req.user.id);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Удаляем refresh-токен из базы данных
    await this.authService.logout(req.user.id);

    // 2. Очищаем куку с refresh-токеном
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    return { message: 'Выход выполнен успешно' };
  }

  @Post('refresh')
  async refreshTokens(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Достаем токен из куки
    // ВАЖНО: для этого в main.ts должен быть подключен cookie-parser!
    const refreshToken = req.cookies['refreshToken'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh токен не найден');
    }

    // 2. Передаем в сервис и получаем новую пару
    const tokens = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: true,
    });

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('update-password')
  async updatePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    const userId = req.user.id;

    await this.authService.changePassword(userId, dto);

    return { message: 'Пароль успешно изменен' };
  }
}
