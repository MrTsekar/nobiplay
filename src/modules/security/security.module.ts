import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityController } from './controller/security.controller';
import { SecurityService } from './service/security.service';
import { IpBlockGuard } from './guard/ip-block.guard';
import { IpBlock } from './entity/ip-block.entity';
import { SecurityLog } from './entity/security-log.entity';
import { FraudAlert } from './entity/fraud-alert.entity';
import { UserSession } from './entity/user-session.entity';
import { Transaction } from '../wallet/entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IpBlock,
      SecurityLog,
      FraudAlert,
      UserSession,
      Transaction,
    ]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService, IpBlockGuard],
  exports: [SecurityService, IpBlockGuard],
})
export class SecurityModule {}
