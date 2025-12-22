import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Avatar } from './avatar.entity';

@Entity('user_avatars')
@Index(['userId', 'avatarId'], { unique: true })
@Index(['userId'])
export class UserAvatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  avatarId: number;

  @ManyToOne(() => Avatar)
  @JoinColumn({ name: 'avatarId' })
  avatar: Avatar;

  @Column({
    type: 'enum',
    enum: ['PURCHASED', 'UNLOCKED', 'GIFTED', 'DEFAULT'],
  })
  source: string;

  @Column({ default: false })
  isEquipped: boolean;

  @CreateDateColumn()
  unlockedAt: Date;
}
