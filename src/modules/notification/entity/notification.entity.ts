import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum NotificationType {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationCategory {
  STREAK = 'streak',
  TOURNAMENT = 'tournament',
  REFERRAL = 'referral',
  REWARD = 'reward',
  LEADERBOARD = 'leaderboard',
  TRIVIA = 'trivia',
  WALLET = 'wallet',
  SYSTEM = 'system',
  MARKETPLACE = 'marketplace',
  PAYMENT = 'payment',
  LOTTO = 'lotto',
  GAMIFICATION = 'gamification',
  PROMOTION = 'promotion',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  category: NotificationCategory;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  @Column({ name: 'sent_at', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  fcmToken?: string;

  @Column({ nullable: true })
  providerMessageId?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ default: false })
  isPriority: boolean;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  scheduledFor?: Date;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
