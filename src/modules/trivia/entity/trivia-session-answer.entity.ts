import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TriviaSession } from './trivia-session.entity';
import { TriviaQuestion } from './trivia-question.entity';

@Entity('trivia_session_answers')
export class TriviaSessionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @Column({ name: 'user_answer' })
  userAnswer: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ name: 'time_taken', nullable: true })
  timeTaken?: number;

  @Column({ name: 'points_earned', default: 0 })
  pointsEarned: number;

  @ManyToOne(() => TriviaSession, (session) => session.answers)
  @JoinColumn({ name: 'session_id' })
  session: TriviaSession;

  @ManyToOne(() => TriviaQuestion)
  @JoinColumn({ name: 'question_id' })
  question: TriviaQuestion;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
