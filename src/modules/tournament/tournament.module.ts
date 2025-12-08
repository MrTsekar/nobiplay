import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tournament } from './entity/tournament.entity';
import { TournamentParticipant } from './entity/tournament-participant.entity';
import { TournamentBet } from './entity/tournament-bet.entity';

import { TournamentService } from './service/tournament.service';
import { TournamentController } from './controller/tournament.controller';

import { WalletModule } from '../wallet/wallet.module';
import { TriviaModule } from '../trivia/trivia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentParticipant,
      TournamentBet,
    ]),
    WalletModule,
    forwardRef(() => TriviaModule),   // ⭐ FIXED HERE
  ],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
