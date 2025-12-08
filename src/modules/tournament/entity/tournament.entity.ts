import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TournamentParticipant } from './tournament-participant.entity';

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  REGISTRATION_OPEN = 'registration_open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TournamentType {
  FREE = 'free',
  PAID = 'paid',
  SPONSORED = 'sponsored',
}

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TournamentType,
    default: TournamentType.FREE,
  })
  type: TournamentType;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.UPCOMING,
  })
  status: TournamentStatus;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  entryFee: number;

  @Column({ name: 'prize_pool', type: 'decimal', precision: 15, scale: 2, default: 0 })
  prizePool: number;

  @Column({ name: 'max_participants', nullable: true })
  maxParticipants?: number;

  @Column({ name: 'current_participants', default: 0 })
  currentParticipants: number;

  @Column({ name: 'total_questions', default: 15 })
  totalQuestions: number;

  @Column({ name: 'question_time_limit', default: 30 })
  questionTimeLimit: number;

  @Column({ name: 'lives_per_player', default: 3 })
  livesPerPlayer: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @Column({ name: 'starts_at' })
  startsAt: Date;

  @Column({ name: 'ends_at' })
  endsAt: Date;

  @Column({ name: 'registration_opens_at' })
  registrationOpensAt: Date;

  @Column({ name: 'registration_closes_at' })
  registrationClosesAt: Date;

  @Column({ nullable: true })
  banner?: string;

  @OneToMany(() => TournamentParticipant, (participant) => participant.tournament)
  participants: TournamentParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
