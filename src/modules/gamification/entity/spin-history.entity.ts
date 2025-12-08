import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { SpinWheelReward } from './spin-wheel-reward.entity';

@Entity('spin_history')
export class SpinHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'reward_id' })
  rewardId: string;

  @Column({ name: 'reward_value', type: 'decimal', precision: 10, scale: 2 })
  rewardValue: number;

  @Column({ name: 'is_claimed', default: false })
  isClaimed: boolean;

  @Column({ name: 'claimed_at', nullable: true })
  claimedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SpinWheelReward)
  @JoinColumn({ name: 'reward_id' })
  reward: SpinWheelReward;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
