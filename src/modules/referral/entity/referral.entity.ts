import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REWARDED = 'rewarded',
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id' })
  referrerId: string;

  @Column({ name: 'referee_id' })
  refereeId: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ name: 'bonus_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonusAmount: number;

  @Column({ name: 'is_rewarded', default: false })
  isRewarded: boolean;

  @Column({ name: 'rewarded_at', nullable: true })
  rewardedAt?: Date;

  @Column({ name: 'first_game_completed', default: false })
  firstGameCompleted: boolean;

  @Column({ name: 'first_game_completed_at', nullable: true })
  firstGameCompletedAt?: Date;

  @ManyToOne(() => User, (user) => user.referralsMade)
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referee_id' })
  referee: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
