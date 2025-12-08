import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardEntry } from './entity/leaderboard-entry.entity';
import { User } from '../user/entity/user.entity';
import { TriviaSession } from '../trivia/entity/trivia-session.entity';
import { LeaderboardService } from './service/leaderboard.service';
import { LeaderboardController } from './controller/leaderboard.controller';
import { CacheModule } from '../../common/modules/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderboardEntry, User, TriviaSession]),
    CacheModule, // 🔥 REQUIRED
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
