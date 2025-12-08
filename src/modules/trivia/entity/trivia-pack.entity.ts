import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TriviaQuestion } from './trivia-question.entity';

@Entity('trivia_packs')
export class TriviaPack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'unlock_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unlockCost: number;

  @Column({ name: 'is_free', default: false })
  isFree: boolean;

  @Column({ name: 'is_sponsored', default: false })
  isSponsored: boolean;

  @Column({ name: 'sponsor_name', nullable: true })
  sponsorName?: string;

  @Column({ name: 'is_limited', default: false })
  isLimited: boolean;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  thumbnail?: string;

  @Column({ name: 'unlock_count', default: 0 })
  unlockCount: number;

  @OneToMany(() => TriviaQuestion, (question) => question.pack)
  questions: TriviaQuestion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
