import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum MysteryBoxTrigger {
  STREAK_MILESTONE = 'streak_milestone',
  LEVEL_UP = 'level_up',
  TOURNAMENT_WIN = 'tournament_win',
  REFERRAL_BONUS = 'referral_bonus',
  DAILY_QUEST = 'daily_quest',
}

export enum MysteryBoxStatus {
  EARNED = 'earned',
  OPENED = 'opened',
  EXPIRED = 'expired',
}

@Entity('mystery_boxes')
export class MysteryBox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: MysteryBoxTrigger,
  })
  trigger: MysteryBoxTrigger;

  @Column({
    type: 'enum',
    enum: MysteryBoxStatus,
    default: MysteryBoxStatus.EARNED,
  })
  status: MysteryBoxStatus;

  @Column({ type: 'json', nullable: true })
  rewards?: Record<string, any>;

  @Column({ name: 'opened_at', nullable: true })
  openedAt?: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
