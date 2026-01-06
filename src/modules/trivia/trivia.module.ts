import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TriviaController } from './controller/trivia.controller';
import { TriviaService } from './service/trivia.service';
import { GameSessionService } from './service/game-session.service';
import { TriviaSession } from './entity/trivia-session.entity';
import { ActiveGameSession } from './entity/active-game-session.entity';

import { WalletModule } from '../wallet/wallet.module';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../user/users.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { TournamentModule } from '../tournament/tournament.module';
import { GamificationModule } from '../gamification/gamification.module';
import { QuestsModule } from '../quests/quests.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { CacheModule } from '../../common/modules/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TriviaSession, ActiveGameSession]),
    WalletModule,
    PaymentModule,
    UsersModule,
    LeaderboardModule,
    forwardRef(() => TournamentModule),
    GamificationModule,
    QuestsModule,
    AchievementsModule,
    CacheModule,
  ],
  controllers: [TriviaController],
  providers: [TriviaService, GameSessionService],
  exports: [TriviaService, TypeOrmModule],
})
export class TriviaModule {}
