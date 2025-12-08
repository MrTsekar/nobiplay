import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../../user/entity/user.entity';

export enum ParticipantStatus {
  REGISTERED = 'registered',
  PLAYING = 'playing',
  COMPLETED = 'completed',
  DISQUALIFIED = 'disqualified',
}

@Entity('tournament_participants')
export class TournamentParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.REGISTERED,
  })
  status: ParticipantStatus;

  @Column({ default: 0 })
  score: number;

  @Column({ name: 'rank_position', nullable: true })
  rankPosition?: number;

  @Column({ name: 'questions_answered', default: 0 })
  questionsAnswered: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @Column({ name: 'lives_remaining', default: 3 })
  livesRemaining: number;

  @Column({ name: 'time_taken', nullable: true })
  timeTaken?: number;

  @Column({ name: 'prize_won', type: 'decimal', precision: 10, scale: 2, default: 0 })
  prizeWon: number;

  @Column({ name: 'is_prize_claimed', default: false })
  isPrizeClaimed: boolean;

  @ManyToOne(() => Tournament, (tournament) => tournament.participants)
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
