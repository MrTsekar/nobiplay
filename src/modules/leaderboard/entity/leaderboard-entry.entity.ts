import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum LeaderboardType {
  GLOBAL = 'global',
  CITY = 'city',
  TRIBE = 'tribe',
  CAMPUS = 'campus',
}

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

@Entity('leaderboard_entries')
@Index(['type', 'period', 'scope'], { unique: false })
@Index(['userId', 'type', 'period'], { unique: false })
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: LeaderboardType,
  })
  type: LeaderboardType;

  @Column({
    type: 'enum',
    enum: LeaderboardPeriod,
  })
  period: LeaderboardPeriod;

  @Column({ nullable: true })
  scope?: string; // city name, tribe name, or campus name

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'rank_position', default: 0 })
  rankPosition: number;

  @Column({ name: 'games_played', default: 0 })
  gamesPlayed: number;

  @Column({ name: 'games_won', default: 0 })
  gamesWon: number;

  @Column({ name: 'total_coins_earned', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCoinsEarned: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'last_updated' })
  lastUpdated: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
