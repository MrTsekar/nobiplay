import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerupsController } from './controller/powerups.controller';
import { PowerupsService } from './service/powerups.service';
import { Powerup } from './entity/powerup.entity';
import { UserPowerup } from './entity/user-powerup.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Powerup, UserPowerup]),
    WalletModule,
  ],
  controllers: [PowerupsController],
  providers: [PowerupsService],
  exports: [PowerupsService, TypeOrmModule],
})
export class PowerupsModule {}
