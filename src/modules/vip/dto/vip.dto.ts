import { IsEnum, IsNumber, IsString, IsBoolean, IsOptional, Min } from 'class-validator';
import { VIPTier } from '../../user/entity/user.entity';

export class SubscribeVIPDto {
  @IsEnum(VIPTier)
  tier: VIPTier;

  @IsString()
  paymentReference: string;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;
}

export class GetSubscriptionHistoryDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class CancelSubscriptionDto {
  @IsString()
  subscriptionId: string;
}

export class ApplyVIPBenefitsDto {
  @IsString()
  userId: string;

  @IsEnum(VIPTier)
  tier: VIPTier;
}
