import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateDataQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Значение должно быть целым числом' })
  @Min(1, { message: 'Минимальное количество записей: 1' })
  @Max(100, { message: 'Максимальное количество записей: 100' })
  count?: number;
}
