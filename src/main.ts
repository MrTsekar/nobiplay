import './common/apm'; // Initialize APM first
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ApmMiddleware } from './common/middleware/apm.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // APM and Logger middleware
  app.use(ApmMiddleware);
  app.use(LoggerMiddleware);
  
  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Nobiplay API')
    .setDescription('The Nobiplay gaming platform API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT'
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User profile and management')
    .addTag('Wallet', 'Wallet and balance management')
    .addTag('Payment', 'Payment processing and verification')
    .addTag('Notification', 'Send and manage notifications')
    .addTag('Admin', 'Admin panel and content management')
    .addTag('Trivia', 'Trivia game endpoints')
    .addTag('Leaderboard', 'Leaderboard data')
    .addTag('Referral', 'Referral program')
    .addTag('Gamification', 'Gamification features')
    .addTag('Lotto', 'Lottery game')
    .addTag('Marketplace', 'Item marketplace')
    .addTag('Tournament', 'Tournament management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3000);
  console.log('Listening on http://localhost:3000');
  console.log('Swagger UI available at http://localhost:3000/api');
}

bootstrap();
