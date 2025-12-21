import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsController } from './controller/quests.controller';
import { QuestsService } from './service/quests.service';
import { Quest } from './entity/quest.entity';
import { UserQuest } from './entity/user-quest.entity';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../user/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, UserQuest]),
    WalletModule,
    UsersModule,
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService, TypeOrmModule],
})
export class QuestsModule {}
