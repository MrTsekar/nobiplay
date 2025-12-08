import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './service/users.service';
import { OtpService } from './service/otp.service';
import { UsersController } from './controller/users.controller';
import { User } from './entity/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    WalletModule,
    forwardRef(() => ReferralModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, OtpService],
  exports: [UsersService, OtpService]
})
export class UsersModule {}
