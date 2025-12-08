import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStreak } from './entity/user-streak.entity';
import { SpinWheelReward } from './entity/spin-wheel-reward.entity';
import { SpinHistory } from './entity/spin-history.entity';
import { MysteryBox } from './entity/mystery-box.entity';
import { User } from '../user/entity/user.entity';
import { GamificationService } from './service/gamification.service';
import { GamificationController } from './controller/gamification.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStreak,
      SpinWheelReward,
      SpinHistory,
      MysteryBox,
      User,
    ]),
    WalletModule,
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
