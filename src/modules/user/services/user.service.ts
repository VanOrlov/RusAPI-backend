import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProvider, User } from 'src/entities/user/user.entity';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, name, password } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await argon2.hash(password);

    const user = this.userRepository.create({
      email,
      name,
      passwordHash,
      provider: AuthProvider.LOCAL,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string | null) {
    await this.userRepository.update(userId, {
      refreshTokenHash,
    });
  }

  async findById(
    id: string,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'> | null> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) return null;

    // Отрезаем секретные данные перед отправкой на фронт
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }

  async findFullById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });
  }

  async changeUserData(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'> | null> {
    await this.userRepository.update(userId, {
      name: dto.name,
    });
    return this.findById(userId);
  }
}
