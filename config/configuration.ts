import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const configuration = () => ({
  db: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'ivanorlov',
    password: 'postgres',
    database: 'rusapi',
    autoLoadEntities: true,
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: true,
  },
  jwt: {
    // В продакшене обязательно выноси в .env!
    accessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
  },
});
