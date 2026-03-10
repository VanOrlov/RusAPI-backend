export const defaultIdSchema = {
  name: 'id',
  type: 'string.uuid',
} as const;

export const defaultCreatedAtSchema = {
  name: 'createdAt',
  type: 'date.recent',
} as const;

export const defaultSchema = [defaultIdSchema, defaultCreatedAtSchema] as const;
