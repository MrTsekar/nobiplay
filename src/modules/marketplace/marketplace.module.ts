import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceItem } from './entity/marketplace-item.entity';
import { Redemption } from './entity/redemption.entity';
import { MarketplaceService } from './service/marketplace.service';
import { MarketplaceController } from './controller/marketplace.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceItem, Redemption]),
    WalletModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
