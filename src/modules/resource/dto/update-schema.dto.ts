import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  Matches,
} from 'class-validator';

// Описываем одно поле (одну строчку в конструкторе)
export class SchemaFieldDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Имя поля может содержать только латиницу, цифры и _',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  type: `${string}.${string}`;
}

export class UpdateSchemaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaFieldDto)
  schema: SchemaFieldDto[];
}
