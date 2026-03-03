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
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { type Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../user/services/user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { type AuthRequest } from './dto/auth-request';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @SkipThrottle()
  @UsePipes(new ValidationPipe())
  @Post('register')
  async register(
    @Body() dto: CreateUserDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Прокидываем ip и userAgent в сервис при регистрации
    const { refreshToken, ...response } = await this.authService.register(
      dto,
      ip,
      userAgent || '',
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: true,
    });

    return response;
  }

  @SkipThrottle()
  @UsePipes(new ValidationPipe())
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.authService.login(
      user.id,
      user.email,
      user.role,
      ip,
      userAgent || '',
    );
  }

  @SkipThrottle()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Req() req: AuthRequest) {
    const user = await this.usersService.findById(req.user.id);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  @SkipThrottle()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 2. Добавили req.user.sessionId (теперь сервис знает, какую сессию удалять)
    await this.authService.logout(req.user.id, req.user.sessionId);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    return { message: 'Выход выполнен успешно' };
  }

  @SkipThrottle()
  @Post('refresh')
  async refreshTokens(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh токен не найден');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: true,
    });

    return { accessToken: tokens.accessToken };
  }

  @SkipThrottle()
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
