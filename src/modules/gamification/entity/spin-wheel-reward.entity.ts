import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum RewardType {
  COINS = 'coins',
  AIRTIME = 'airtime',
  DATA = 'data',
  RETRY_TOKEN = 'retry_token',
  TOURNAMENT_PASS = 'tournament_pass',
  MYSTERY_BOX = 'mystery_box',
  XP_BOOST = 'xp_boost',
}

@Entity('spin_wheel_rewards')
export class SpinWheelReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  type: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'probability_weight' })
  probabilityWeight: number; // Used for weighted random selection

  @Column({ nullable: true })
  icon?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
