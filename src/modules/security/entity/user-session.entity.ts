import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_sessions')
@Index(['userId', 'isActive'])
@Index(['sessionToken'], { unique: true })
@Index(['expiresAt'])
export class UserSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column({ unique: true })
  sessionToken: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  deviceFingerprint?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column('simple-json', { nullable: true })
  metadata?: {
    loginMethod?: string;
    location?: string;
    deviceType?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
