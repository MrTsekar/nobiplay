import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'nobiplay'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get('DB_SYNCHRONIZE', true),
  logging: configService.get('DB_LOGGING', false),
  ssl:
    configService.get('DB_SSL') === 'true'
      ? { rejectUnauthorized: false }
      : false,
});
