import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LottoEntry } from './lotto-entry.entity';

export enum DrawStatus {
  OPEN = 'open',
  DRAWING = 'drawing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DrawFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

@Entity('lotto_draws')
export class LottoDraw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: DrawFrequency,
  })
  frequency: DrawFrequency;

  @Column({
    type: 'enum',
    enum: DrawStatus,
    default: DrawStatus.OPEN,
  })
  status: DrawStatus;

  @Column({ name: 'entry_cost', type: 'decimal', precision: 10, scale: 2 })
  entryCost: number;

  @Column({ name: 'prize_pool', type: 'decimal', precision: 15, scale: 2, default: 0 })
  prizePool: number;

  @Column({ name: 'total_entries', default: 0 })
  totalEntries: number;

  @Column({ name: 'max_entries_per_user', default: 10 })
  maxEntriesPerUser: number;

  @Column({ name: 'winner_user_id', nullable: true })
  winnerUserId?: string;

  @Column({ name: 'prize_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  prizeAmount?: number;

  @Column({ name: 'draw_time' })
  drawTime: Date;

  @Column({ name: 'closes_at' })
  closesAt: Date;

  @OneToMany(() => LottoEntry, (entry) => entry.draw)
  entries: LottoEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
