import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VIPController } from './controller/vip.controller';
import { VIPService } from './service/vip.service';
import { VIPSubscription } from './entity/vip-subscription.entity';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VIPSubscription, User])],
  controllers: [VIPController],
  providers: [VIPService],
  exports: [VIPService, TypeOrmModule],
})
export class VIPModule {}
