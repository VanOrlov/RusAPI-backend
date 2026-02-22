import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../user/services/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../../entities/user/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const newUser = await this.usersService.create(createUserDto);
    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.role,
    );
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    };
  }

  async login(userId: string, email: string, role: string) {
    const tokens = await this.getTokens(userId, email, role);
    await this.updateRefreshToken(userId, tokens.refreshToken);

    const user = await this.usersService.userRepository.findOne({
      where: { id: userId },
    }); // Получаем актуальные данные пользователя, если нужно, или передаем их аргументами.
    // Оптимизация: можно передавать имя и роль сразу в аргументы, чтобы не делать select,
    // но для чистоты и возврата полного объекта user иногда проще сделать select или вернуть то что есть.

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: userId,
        email: email,
        role: role,
        name: user?.name, // Добавим имя, это полезно для фронта
      },
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      user.passwordHash &&
      (await argon2.verify(user.passwordHash, password))
    ) {
      const result = { ...user };
      delete (result as Partial<User>).passwordHash;
      delete (result as Partial<User>).refreshTokenHash;
      return result;
    }
    return null;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async getTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: this.configService.get<string>('jwt.accessSecret'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    // Передаем null, чтобы затереть хэш в базе
    await this.usersService.updateRefreshToken(userId, null);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        },
      );

      const user = await this.usersService.findFullById(payload.sub);

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Доступ запрещен');
      }

      // 3. Сравниваем токен из куки с хэшем из базы (защита от кражи)
      const isRefreshTokenValid = await argon2.verify(
        user.refreshTokenHash,
        refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Невалидный токен');
      }
      const tokens = await this.getTokens(user.id, user.email, user.role);

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (e) {
      // Если токен протух физически (прошло 7 дней) или подделан
      throw new UnauthorizedException('Токен недействителен', e);
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    // 1. Достаем юзера со ВСЕМИ полями (помнишь, мы делали findFullById?)
    const user = await this.usersService.findFullById(userId);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // 2. Проверяем, совпадает ли старый пароль с текущим хэшем в базе
    const isOldPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.oldPassword,
    );

    if (!isOldPasswordValid) {
      // Выкидываем BadRequest, текст которого поймает наш фронтенд!
      throw new BadRequestException('Неверный текущий пароль');
    }

    // 3. Хэшируем новый пароль
    const newPasswordHash = await argon2.hash(dto.newPassword);

    // 4. Сохраняем новый хэш в базу
    await this.usersService.updatePassword(user.id, newPasswordHash);
  }
}
