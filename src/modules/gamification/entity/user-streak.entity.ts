import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

@Entity('user_streaks')
@Index(['userId'], { unique: true })
export class UserStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_play_date', nullable: true })
  lastPlayDate?: Date;

  @Column({ name: 'streak_start_date', nullable: true })
  streakStartDate?: Date;

  @Column({ name: 'total_days_played', default: 0 })
  totalDaysPlayed: number;

  @Column({ name: 'streak_freeze_count', default: 0 })
  streakFreezeCount: number;

  @Column({ name: 'last_freeze_used', nullable: true })
  lastFreezeUsed?: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
