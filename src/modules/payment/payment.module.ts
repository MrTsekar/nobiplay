import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controller/payment.controller';
import { PaymentService } from './service/payment.service';
import { PaymentTransaction } from './entity/payment-transaction.entity';
import { PaymentWebhook } from './entity/payment-webhook.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, PaymentWebhook])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
