import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentProvider {
  PAYSTACK = 'paystack',
  MONNIFY = 'monnify',
  VAS = 'vas',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  USSD = 'ussd',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  method?: PaymentMethod;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ unique: true, nullable: true })
  reference: string;

  @Column({ nullable: true })
  providerTransactionId?: string;

  @Column({ nullable: true })
  providerReference?: string;

  @Column({ nullable: true })
  paymentUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  cardLast4?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ nullable: true })
  receiptUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  refundedAt?: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  refundAmount?: number;
}
