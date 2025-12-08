import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LottoDraw } from './lotto-draw.entity';
import { User } from '../../user/entity/user.entity';

@Entity('lotto_entries')
export class LottoEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'draw_id' })
  drawId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'ticket_number', unique: true })
  ticketNumber: string;

  @Column({ name: 'is_winner', default: false })
  isWinner: boolean;

  @Column({ name: 'prize_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  prizeAmount: number;

  @Column({ name: 'is_prize_claimed', default: false })
  isPrizeClaimed: boolean;

  @ManyToOne(() => LottoDraw, (draw) => draw.entries)
  @JoinColumn({ name: 'draw_id' })
  draw: LottoDraw;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
