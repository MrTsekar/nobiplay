import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../../user/entity/user.entity';

export enum BetType {
  WINNER = 'winner', // Bet on who will win the tournament
  CATEGORY_DOMINANCE = 'category_dominance', // Which trivia category will dominate
  TOP_SCORER = 'top_scorer', // Predict top scorer from referral circle
  ACCURACY_THRESHOLD = 'accuracy_threshold', // Bet on average accuracy threshold
}

export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

@Entity('tournament_bets')
export class TournamentBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: BetType,
  })
  type: BetType;

  @Column({
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.PENDING,
  })
  status: BetStatus;

  @Column({ name: 'stake_amount', type: 'decimal', precision: 10, scale: 2 })
  stakeAmount: number;

  @Column({ name: 'potential_payout', type: 'decimal', precision: 10, scale: 2 })
  potentialPayout: number;

  @Column({ name: 'actual_payout', type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualPayout: number;

  @Column({ type: 'json' })
  prediction: {
    userId?: string; // For WINNER and TOP_SCORER bets
    categoryId?: string; // For CATEGORY_DOMINANCE bets
    threshold?: number; // For ACCURACY_THRESHOLD bets
  };

  @Column({ type: 'json', nullable: true })
  result?: {
    actualValue: string | number;
    isCorrect: boolean;
  };

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
