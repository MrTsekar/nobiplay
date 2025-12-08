import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, Min, IsUUID } from 'class-validator';
import { TransactionType } from '../entity/transaction.entity';

/**
 * DTO for crediting coins to wallet
 */
export class CreditCoinsDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for debiting coins from wallet
 */
export class DebitCoinsDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for cash top-up (card/bank transfer)
 */
export class TopUpCashDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod: 'card' | 'bank_transfer' | 'airtime';

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

/**
 * DTO for airtime redemption
 */
export class RedeemAirtimeDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(50)
  amount: number;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  network: 'MTN' | 'Airtel' | 'Glo' | '9mobile';
}

/**
 * DTO for data redemption
 */
export class RedeemDataDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  network: 'MTN' | 'Airtel' | 'Glo' | '9mobile';

  @IsNotEmpty()
  @IsString()
  dataBundle: string;
}

/**
 * DTO for cash withdrawal
 */
export class WithdrawCashDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1000)
  amount: number;

  @IsNotEmpty()
  @IsString()
  bankAccount: string;

  @IsNotEmpty()
  @IsString()
  bankCode: string;

  @IsOptional()
  @IsString()
  pin?: string;
}

/**
 * DTO for crypto wallet linking
 */
export class LinkCryptoWalletDto {
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @IsNotEmpty()
  @IsString()
  walletType: 'Binance' | 'Trust Wallet' | 'Luno' | 'MetaMask' | 'Other';
}

/**
 * DTO for crypto redemption (USDT payout)
 */
export class RedeemCryptoDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(500)
  coinAmount: number;

  @IsNotEmpty()
  @IsString()
  cryptoType: 'USDT' | 'USDC';

  @IsOptional()
  @IsString()
  pin?: string;
}

/**
 * DTO for getting transaction history
 */
export class GetTransactionsDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * DTO for coin purchase
 */
export class PurchaseCoinsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod: 'card' | 'bank_transfer' | 'airtime';

  @IsOptional()
  @IsString()
  paymentReference?: string;
}
