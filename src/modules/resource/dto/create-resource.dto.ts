import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя эндпоинта не может быть пустым' })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Имя эндпоинта может содержать только латинские буквы, цифры, дефис и подчеркивание',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  projectNanoId: string; // Передаем ID проекта, чтобы знать, куда прикрепить ресурс
}
