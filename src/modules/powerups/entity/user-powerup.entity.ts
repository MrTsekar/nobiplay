import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Powerup } from './powerup.entity';

export enum PowerupStatus {
  AVAILABLE = 'available',
  USED = 'used',
  EXPIRED = 'expired',
}

@Entity('user_powerups')
@Index(['userId', 'powerupId', 'status'])
@Index(['userId', 'expiresAt'])
export class UserPowerup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'powerup_id' })
  powerupId: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: PowerupStatus,
    default: PowerupStatus.AVAILABLE,
  })
  status: PowerupStatus;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Powerup)
  @JoinColumn({ name: 'powerup_id' })
  powerup: Powerup;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
