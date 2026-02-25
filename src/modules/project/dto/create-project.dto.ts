import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Название проекта обязательно' })
  @MaxLength(50, { message: 'Название слишком длинное (максимум 50 символов)' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Описание слишком длинное' })
  description?: string;
}
