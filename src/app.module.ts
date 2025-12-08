import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TriviaModule } from './modules/trivia/trivia.module';
import { ReferralModule } from './modules/referral/referral.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { LottoModule } from './modules/lotto/lotto.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { getDatabaseConfig } from './database/database.config';
import { CacheService } from './common/services/cache.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    WalletModule,
    TriviaModule,
    ReferralModule,
    LeaderboardModule,
    TournamentModule,
    LottoModule,
    GamificationModule,
    MarketplaceModule,
    PaymentModule,
    NotificationModule,
    AdminModule,
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
