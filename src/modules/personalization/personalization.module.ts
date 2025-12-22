import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalizationController } from './controller/personalization.controller';
import { PersonalizationService } from './service/personalization.service';
import { Avatar } from './entity/avatar.entity';
import { ProfileItem } from './entity/profile-item.entity';
import { UserAvatar } from './entity/user-avatar.entity';
import { UserProfileItem } from './entity/user-profile-item.entity';
import { User } from '../user/entity/user.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Avatar, ProfileItem, UserAvatar, UserProfileItem, User]),
    WalletModule,
  ],
  controllers: [PersonalizationController],
  providers: [PersonalizationService],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}
