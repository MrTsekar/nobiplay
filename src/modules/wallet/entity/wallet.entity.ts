import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
@Index(['userId'], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'coin_balance', default: 0 })
  coinBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'cash_balance', default: 0 })
  cashBalance: number;

  @Column({ name: 'crypto_wallet_address', nullable: true })
  cryptoWalletAddress?: string;

  @Column({ name: 'total_coins_earned', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCoinsEarned: number;

  @Column({ name: 'total_coins_spent', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCoinsSpent: number;

  @Column({ name: 'total_cash_earned', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCashEarned: number;

  @Column({ name: 'total_cash_withdrawn', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCashWithdrawn: number;

  @Column({ name: 'last_crypto_withdrawal', nullable: true })
  lastCryptoWithdrawal?: Date;

  @Column({ name: 'daily_coins_earned', type: 'decimal', precision: 15, scale: 2, default: 0 })
  dailyCoinsEarned: number;

  @Column({ name: 'daily_sessions_played', default: 0 })
  dailySessionsPlayed: number;

  @Column({ name: 'last_limit_reset', nullable: true })
  lastLimitReset?: Date;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
