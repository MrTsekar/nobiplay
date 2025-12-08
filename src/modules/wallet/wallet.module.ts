import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './controller/wallet.controller';
import { WalletService } from './service/wallet.service';
import { Wallet } from './entity/wallet.entity';
import { Transaction } from './entity/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
