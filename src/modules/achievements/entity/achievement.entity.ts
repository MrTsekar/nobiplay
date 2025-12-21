import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AchievementType {
  GAMES_PLAYED = 'games_played',
  GAMES_WON = 'games_won',
  PERFECT_SCORES = 'perfect_scores',
  TOTAL_COINS = 'total_coins',
  WIN_STREAK = 'win_streak',
  CATEGORY_MASTER = 'category_master',
  TOURNAMENT_WINS = 'tournament_wins',
  REFERRALS = 'referrals',
  LEVEL_REACHED = 'level_reached',
  MYSTERY_BOXES = 'mystery_boxes',
  DAILY_LOGIN = 'daily_login',
  SPEED_DEMON = 'speed_demon',
  ACCURACY = 'accuracy',
}

export enum AchievementTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: AchievementType,
  })
  type: AchievementType;

  @Column({
    type: 'enum',
    enum: AchievementTier,
  })
  tier: AchievementTier;

  @Column({ name: 'required_value' })
  requiredValue: number;

  @Column()
  icon: string;

  @Column({ name: 'coin_reward', type: 'decimal', precision: 10, scale: 2 })
  coinReward: number;

  @Column({ name: 'xp_reward' })
  xpReward: number;

  @Column({ name: 'badge_url', nullable: true })
  badgeUrl?: string;

  @Column({ name: 'is_secret', default: false })
  isSecret: boolean; // Hidden achievements

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: any; // Additional requirements

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
