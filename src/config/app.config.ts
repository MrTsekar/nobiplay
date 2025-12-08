import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  jwtExpiration: string;
  throttle: {
    ttl: number;
    limit: number;
  };
  cors: {
    enabled: boolean;
    origin: string[];
  };
  logging: {
    level: string;
  };
}

export function getAppConfig(config: ConfigService): AppConfig {
  return {
    nodeEnv: config.get<string>('NODE_ENV', 'development'),
    port: config.get<number>('PORT', 3000),
    jwtSecret: config.get<string>('JWT_SECRET', 'dev-secret-key'),
    jwtExpiration: config.get<string>('JWT_EXPIRATION', '24h'),
    throttle: {
      ttl: config.get<number>('THROTTLE_TTL', 60000),
      limit: config.get<number>('THROTTLE_LIMIT', 100),
    },
    cors: {
      enabled: config.get<boolean>('CORS_ENABLED', true),
      origin: config
        .get<string>('CORS_ORIGIN', 'http://localhost:3001')
        .split(','),
    },
    logging: {
      level: config.get<string>('LOG_LEVEL', 'debug'),
    },
  };
}
