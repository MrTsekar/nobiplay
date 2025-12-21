import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Quest } from './quest.entity';

export enum UserQuestStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CLAIMED = 'claimed',
}

@Entity('user_quests')
@Index(['userId', 'questId', 'status'])
@Index(['userId', 'expiresAt'])
export class UserQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'quest_id' })
  questId: string;

  @Column({
    type: 'enum',
    enum: UserQuestStatus,
    default: UserQuestStatus.ACTIVE,
  })
  status: UserQuestStatus;

  @Column({ name: 'current_progress', default: 0 })
  currentProgress: number;

  @Column({ name: 'target_value' })
  targetValue: number;

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'claimed_at', nullable: true })
  claimedAt?: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Quest)
  @JoinColumn({ name: 'quest_id' })
  quest: Quest;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
