import { defaultIdSchema } from '../constants';
import { SchemaFieldDto } from '../dto/update-schema.dto';

export const validateDefaultIdInSchema = (schema: SchemaFieldDto[]) => {
  if (!schema.length) return false;
  const firstEl = schema[0];
  return JSON.stringify(firstEl) == JSON.stringify(defaultIdSchema);
};
