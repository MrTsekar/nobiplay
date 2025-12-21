import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum QuestType {
  PLAY_GAMES = 'play_games',
  WIN_GAMES = 'win_games',
  PERFECT_SCORE = 'perfect_score',
  ACCURACY_THRESHOLD = 'accuracy_threshold',
  EARN_COINS = 'earn_coins',
  WIN_STREAK = 'win_streak',
  PLAY_CATEGORY = 'play_category',
  PLAY_MODE = 'play_mode',
  SPIN_WHEEL = 'spin_wheel',
  OPEN_MYSTERY_BOX = 'open_mystery_box',
  REFER_FRIEND = 'refer_friend',
}

export enum QuestFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ONE_TIME = 'one_time',
}

export enum QuestDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  LEGENDARY = 'legendary',
}

@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: QuestType,
  })
  type: QuestType;

  @Column({
    type: 'enum',
    enum: QuestFrequency,
  })
  frequency: QuestFrequency;

  @Column({
    type: 'enum',
    enum: QuestDifficulty,
    default: QuestDifficulty.EASY,
  })
  difficulty: QuestDifficulty;

  @Column({ name: 'target_value' })
  targetValue: number;

  @Column({ name: 'coin_reward', type: 'decimal', precision: 10, scale: 2 })
  coinReward: number;

  @Column({ name: 'xp_reward', default: 0 })
  xpReward: number;

  @Column({ name: 'bonus_reward', nullable: true })
  bonusReward?: string; // JSON: { type: 'mystery_box' | 'powerup', value: string }

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'order_priority', default: 0 })
  orderPriority: number;

  @Column({ nullable: true })
  icon?: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: any; // Additional quest parameters (category, mode, etc.)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
