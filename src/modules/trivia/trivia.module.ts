import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TriviaController } from './controller/trivia.controller';
import { TriviaService } from './service/trivia.service';
import { TriviaSession } from './entity/trivia-session.entity';

import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../user/users.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { TournamentModule } from '../tournament/tournament.module';
import { GamificationModule } from '../gamification/gamification.module';
import { QuestsModule } from '../quests/quests.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TriviaSession]),
    WalletModule,
    UsersModule,
    LeaderboardModule,
    forwardRef(() => TournamentModule),
    GamificationModule,
    QuestsModule,
    AchievementsModule,
  ],
  controllers: [TriviaController],
  providers: [TriviaService],
  exports: [TriviaService, TypeOrmModule],
})
export class TriviaModule {}
