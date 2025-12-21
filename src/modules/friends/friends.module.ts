import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsController } from './controller/friends.controller';
import { FriendsService } from './service/friends.service';
import { FriendRequest } from './entity/friend-request.entity';
import { Friendship } from './entity/friendship.entity';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FriendRequest, Friendship, User])],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService, TypeOrmModule],
})
export class FriendsModule {}
