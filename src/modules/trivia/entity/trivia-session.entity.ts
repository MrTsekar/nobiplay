import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum SessionStatus {
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum SessionMode {
  SOLO = 'solo',
  PVP = 'pvp',
  TOURNAMENT = 'tournament',
  DAILY_CHALLENGE = 'daily_challenge',
}

@Entity('trivia_sessions')
@Index(['userId', 'status', 'completedAt'])
@Index(['tournamentId', 'status'])
@Index(['userId', 'createdAt'])
export class TriviaSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: SessionMode,
    default: SessionMode.SOLO,
  })
  mode: SessionMode;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.COMPLETED,
  })
  status: SessionStatus;

  @Column({ name: 'stake_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stakeAmount: number;

  @Column({ name: 'total_questions', default: 0 })
  totalQuestions: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @Column({ name: 'wrong_answers', default: 0 })
  wrongAnswers: number;

  @Column({ name: 'coins_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
  coinsEarned: number;

  @Column({ name: 'xp_earned', default: 0 })
  xpEarned: number;

  @Column({ name: 'accuracy_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracyPercentage: number;

  @Column({ name: 'time_taken', nullable: true })
  timeTaken?: number;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'tournament_id', nullable: true })
  tournamentId?: string;

  @ManyToOne(() => User, (user) => user.triviaSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
