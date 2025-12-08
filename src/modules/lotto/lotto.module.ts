import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LottoDraw } from './entity/lotto-draw.entity';
import { LottoEntry } from './entity/lotto-entry.entity';
import { LottoService } from './service/lotto.service';
import { LottoController } from './controller/lotto.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([LottoDraw, LottoEntry]), WalletModule],
  controllers: [LottoController],
  providers: [LottoService],
  exports: [LottoService],
})
export class LottoModule {}
