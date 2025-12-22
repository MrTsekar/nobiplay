import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FraudAlertType {
  MULTIPLE_DEVICES = 'MULTIPLE_DEVICES',
  RAPID_TRANSACTIONS = 'RAPID_TRANSACTIONS',
  UNUSUAL_LOCATION = 'UNUSUAL_LOCATION',
  ACCOUNT_SHARING = 'ACCOUNT_SHARING',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  VELOCITY_CHECK = 'VELOCITY_CHECK',
  REFERRAL_FRAUD = 'REFERRAL_FRAUD',
}

export enum AlertStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  CONFIRMED = 'CONFIRMED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  RESOLVED = 'RESOLVED',
}

@Entity('fraud_alerts')
@Index(['userId'])
@Index(['status'])
@Index(['alertType'])
@Index(['createdAt'])
export class FraudAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column({
    type: 'enum',
    enum: FraudAlertType,
  })
  alertType: FraudAlertType;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.PENDING,
  })
  status: AlertStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  riskScore: number; // 0-100

  @Column('text')
  description: string;

  @Column('simple-json')
  evidence: {
    ipAddresses?: string[];
    devices?: string[];
    transactionIds?: number[];
    patterns?: string[];
    locations?: string[];
    timeframe?: string;
  };

  @Column({ nullable: true })
  reviewedBy?: string; // Admin ID

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ default: false })
  actionTaken: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
