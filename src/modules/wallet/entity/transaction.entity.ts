import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  COIN_EARN = 'coin_earn',
  COIN_SPEND = 'coin_spend',
  COIN_PURCHASE = 'coin_purchase',
  CASH_DEPOSIT = 'cash_deposit',
  CASH_WITHDRAW = 'cash_withdraw',
  AIRTIME_REDEEM = 'airtime_redeem',
  DATA_REDEEM = 'data_redeem',
  CRYPTO_WITHDRAW = 'crypto_withdraw',
  REFERRAL_BONUS = 'referral_bonus',
  TOURNAMENT_WIN = 'tournament_win',
  SPIN_REWARD = 'spin_reward',
  MYSTERY_BOX = 'mystery_box',
  STREAK_BONUS = 'streak_bonus',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'balance_before' })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'reference', unique: true })
  reference: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
