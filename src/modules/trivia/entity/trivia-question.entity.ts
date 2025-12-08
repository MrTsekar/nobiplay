import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TriviaCategory } from './trivia-category.entity';
import { TriviaPack } from './trivia-pack.entity';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('trivia_questions')
export class TriviaQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'json' })
  options: string[];

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ name: 'pack_id', nullable: true })
  packId?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
  })
  difficulty: DifficultyLevel;

  @Column({ name: 'time_limit', default: 30 })
  timeLimit: number;

  @Column({ name: 'points_value', default: 10 })
  pointsValue: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @ManyToOne(() => TriviaCategory, (category) => category.questions)
  @JoinColumn({ name: 'category_id' })
  category: TriviaCategory;

  @ManyToOne(() => TriviaPack, (pack) => pack.questions, { nullable: true })
  @JoinColumn({ name: 'pack_id' })
  pack?: TriviaPack;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
