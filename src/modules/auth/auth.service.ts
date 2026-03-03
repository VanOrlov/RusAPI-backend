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
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // 1. Исправлена регистрация: теперь она тоже создает сессию в Redis
  async register(createUserDto: CreateUserDto, ip: string, userAgent: string) {
    const newUser = await this.usersService.create(createUserDto);
    const sessionId = uuidv4();

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.role,
      sessionId,
    );

    const hash = await argon2.hash(tokens.refreshToken);
    const expiresInSec = 7 * 24 * 60 * 60;

    await this.redisService.createSession(
      newUser.id,
      sessionId,
      hash,
      ip,
      userAgent,
      expiresInSec,
    );

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

  async login(user: Omit<User, 'passwordHash'>, ip: string, userAgent: string) {
    const sessionId = uuidv4();
    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
      sessionId,
    );

    const hash = await argon2.hash(tokens.refreshToken);
    const expiresInSec = 7 * 24 * 60 * 60;

    await this.redisService.createSession(
      user.id,
      sessionId,
      hash,
      ip,
      userAgent,
      expiresInSec,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
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
      return result;
    }
    return null;
  }

  // МЕТОД updateRefreshToken ПОЛНОСТЬЮ УДАЛЕН - он больше не нужен

  async getTokens(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ) {
    const payload = { sub: userId, email, role, sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, sessionId: string) {
    await this.redisService.deleteSession(userId, sessionId);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        },
      );

      const userId = payload.sub;
      const sessionId = payload.sessionId;

      const sessionData = await this.redisService.getSession(sessionId);

      if (!sessionData) {
        throw new UnauthorizedException('Сессия не найдена или завершена');
      }

      const isTokenValid = await argon2.verify(
        sessionData.refreshTokenHash,
        refreshToken,
      );
      if (!isTokenValid) {
        throw new UnauthorizedException('Невалидный токен');
      }

      const user = await this.usersService.findFullById(userId);
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      const tokens = await this.getTokens(
        user.id,
        user.email,
        user.role,
        sessionId,
      );
      const newHash = await argon2.hash(tokens.refreshToken);
      const expiresInSec = 7 * 24 * 60 * 60;

      await this.redisService.updateSession(sessionId, newHash, expiresInSec);

      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Токен недействителен', e);
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findFullById(userId);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isOldPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.oldPassword,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await this.usersService.updatePassword(user.id, newPasswordHash);
  }
}
