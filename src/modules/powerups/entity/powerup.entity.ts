import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PowerupType {
  TIME_FREEZE = 'time_freeze',        // Pause timer for 5 seconds
  FIFTY_FIFTY = 'fifty_fifty',        // Remove 2 wrong answers
  SKIP_QUESTION = 'skip_question',    // Skip current question
  DOUBLE_XP = 'double_xp',            // 2x XP for next game
  COIN_MULTIPLIER = 'coin_multiplier', // 1.5x coins for next game
  HINT = 'hint',                      // Show hint for question
  EXTRA_LIFE = 'extra_life',          // Extra chance in tournament
  CATEGORY_LOCK = 'category_lock',    // Lock preferred category
}

export enum PowerupRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('powerups')
export class Powerup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: PowerupType,
    unique: true,
  })
  type: PowerupType;

  @Column({
    type: 'enum',
    enum: PowerupRarity,
  })
  rarity: PowerupRarity;

  @Column({ name: 'coin_price', type: 'decimal', precision: 10, scale: 2 })
  coinPrice: number;

  @Column({ name: 'cash_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cashPrice: number;

  @Column({ default: 1 })
  duration: number; // Duration in seconds or games

  @Column()
  icon: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_stackable', default: false })
  isStackable: boolean;

  @Column({ name: 'max_uses_per_game', default: 1 })
  maxUsesPerGame: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
