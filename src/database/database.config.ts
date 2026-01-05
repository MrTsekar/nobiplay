import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  // Check if DATABASE_URL is provided (Render-style configuration)
  const databaseUrl = config.get('DATABASE_URL');
  
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: config.get('NODE_ENV') !== 'production',
      ssl:
        config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  // Fallback to individual environment variables
  return {
    type: 'postgres',
    host: config.get('DB_HOST') || 'localhost',
    port: parseInt(config.get('DB_PORT') || '5432', 10),
    username: config.get('DB_USERNAME') || 'postgres',
    password: config.get('DB_PASSWORD') || 'password',
    database: config.get('DB_NAME') || 'nobiplay',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
  };
};
