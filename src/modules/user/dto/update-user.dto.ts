import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(2, { message: 'Имя слишком короткое' })
  @MaxLength(32, { message: 'Имя не должно превышать 32 символа' })
  name: string;
}
