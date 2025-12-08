import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider, PaymentMethod } from '../entity/payment-transaction.entity';

export class InitiatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'NGN';

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaymentVerificationDto {
  @IsString()
  reference: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}

export class PaymentWebhookDto {
  @IsString()
  event: string;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class InitiateRefundDto {
  @IsUUID()
  transactionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsString()
  status?: string;
}

export class PaymentResponseDto {
  id: string;
  reference: string;
  amount: number;
  status: string;
  provider: string;
  paymentUrl?: string;
  createdAt: Date;
}

export class GetTransactionDetailsDto {
  @IsUUID()
  transactionId: string;
}
