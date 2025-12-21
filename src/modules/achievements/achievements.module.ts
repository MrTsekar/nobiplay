import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController } from './controller/achievements.controller';
import { AchievementsService } from './service/achievements.service';
import { Achievement } from './entity/achievement.entity';
import { UserAchievement } from './entity/user-achievement.entity';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../user/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement]),
    WalletModule,
    UsersModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService, TypeOrmModule],
})
export class AchievementsModule {}
