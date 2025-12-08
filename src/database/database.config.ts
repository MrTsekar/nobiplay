import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('DB_HOST') || 'localhost',
  port: parseInt(config.get('DB_PORT') || '5432', 10),
  username: config.get('DB_USERNAME') || 'postgres',
  password: config.get('DB_PASSWORD') || 'password',
  database: config.get('DB_NAME') || 'nobiplay',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
});
