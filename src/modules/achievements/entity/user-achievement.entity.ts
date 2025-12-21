import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Achievement } from './achievement.entity';

@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
@Index(['userId', 'unlockedAt'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'achievement_id' })
  achievementId: string;

  @Column({ name: 'current_progress', default: 0 })
  currentProgress: number;

  @Column({ name: 'required_value' })
  requiredValue: number;

  @Column({ name: 'is_unlocked', default: false })
  isUnlocked: boolean;

  @Column({ name: 'unlocked_at', nullable: true })
  unlockedAt?: Date;

  @Column({ name: 'reward_claimed', default: false })
  rewardClaimed: boolean;

  @Column({ name: 'claimed_at', nullable: true })
  claimedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
