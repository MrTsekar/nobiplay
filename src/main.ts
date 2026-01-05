// Initialize APM first (side-effect import only)
import './common/apm';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes (optional but recommended)
  app.setGlobalPrefix('api/v1');

  // Enhanced CORS configuration for production readiness
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4200',
        'http://localhost:5173', // Vite default
        'http://localhost:8080', // Vue CLI default
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Check if origin is in allowed list
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Api-Key',
      'X-Device-Id',
      'X-App-Version',
    ],
    exposedHeaders: [
      'X-Total-Count', 
      'X-Page-Number', 
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

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

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Nobiplay API')
    .setDescription('The Nobiplay gaming platform API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth')
    .addTag('Users')
    .addTag('Wallet')
    .addTag('Payment')
    .addTag('Notification')
    .addTag('Admin')
    .addTag('Trivia')
    .addTag('Leaderboard')
    .addTag('Referral')
    .addTag('Gamification')
    .addTag('Lotto')
    .addTag('Marketplace')
    .addTag('Tournament')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces

  console.log(`🚀 Listening on http://localhost:${port}`);
  console.log(`📚 API available at http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger UI available at http://localhost:${port}/api/docs`);
  console.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
}

bootstrap();
