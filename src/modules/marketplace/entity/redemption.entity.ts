import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { MarketplaceItem } from './marketplace-item.entity';

export enum RedemptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('redemptions')
export class Redemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'coin_cost' })
  coinCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'cash_value', nullable: true })
  cashValue?: number;

  @Column({
    type: 'enum',
    enum: RedemptionStatus,
    default: RedemptionStatus.PENDING,
  })
  status: RedemptionStatus;

  @Column({ name: 'transaction_reference', unique: true })
  transactionReference: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone?: string;

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail?: string;

  @Column({ name: 'bank_account', nullable: true })
  bankAccount?: string;

  @Column({ name: 'crypto_address', nullable: true })
  cryptoAddress?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'processed_at', nullable: true })
  processedAt?: Date;

  @Column({ name: 'failed_reason', type: 'text', nullable: true })
  failedReason?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => MarketplaceItem)
  @JoinColumn({ name: 'item_id' })
  item: MarketplaceItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
