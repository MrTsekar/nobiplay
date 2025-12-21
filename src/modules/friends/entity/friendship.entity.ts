import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

export enum FriendshipStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

@Entity('friendships')
@Index(['userId', 'friendId'], { unique: true })
@Index(['userId', 'status'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'friend_id' })
  friendId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.ACTIVE,
  })
  status: FriendshipStatus;

  @Column({ name: 'blocked_at', nullable: true })
  blockedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'friend_id' })
  friend: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
