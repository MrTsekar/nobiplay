import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TriviaController } from './controller/trivia.controller';
import { TriviaService } from './service/trivia.service';

import { TriviaQuestion } from './entity/trivia-question.entity';
import { TriviaSession } from './entity/trivia-session.entity';
import { TriviaSessionAnswer } from './entity/trivia-session-answer.entity';
import { TriviaCategory } from './entity/trivia-category.entity';
import { TriviaPack } from './entity/trivia-pack.entity';

import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../user/users.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { TournamentModule } from '../tournament/tournament.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TriviaQuestion,
      TriviaSession,
      TriviaSessionAnswer,
      TriviaCategory,
      TriviaPack,
    ]),
    WalletModule,
    UsersModule,
    LeaderboardModule,
    forwardRef(() => TournamentModule),   // ⭐ FIXED HERE
    GamificationModule,
  ],
  controllers: [TriviaController],
  providers: [TriviaService],
  exports: [
    TriviaService,
    TypeOrmModule, // optional but useful for repositories
  ],
})
export class TriviaModule {}
