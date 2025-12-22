import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { AdminUser } from './admin.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketCategory {
  ACCOUNT = 'ACCOUNT',
  PAYMENT = 'PAYMENT',
  TECHNICAL = 'TECHNICAL',
  GAMEPLAY = 'GAMEPLAY',
  REPORT = 'REPORT',
  OTHER = 'OTHER',
}

@Entity('support_tickets')
@Index(['userId', 'status'])
@Index(['assignedToId', 'status'])
@Index(['createdAt'])
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  assignedToId: number;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: AdminUser;

  @Column({
    type: 'enum',
    enum: TicketCategory,
  })
  category: TicketCategory;

  @Column()
  subject: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column('simple-json', { nullable: true })
  metadata?: {
    userAgent?: string;
    deviceInfo?: string;
    errorLogs?: string[];
    screenshots?: string[];
  };

  @Column('text', { nullable: true })
  adminNotes?: string;

  @Column('text', { nullable: true })
  resolution?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
