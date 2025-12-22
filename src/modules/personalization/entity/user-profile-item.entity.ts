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
import { ProfileItem } from './profile-item.entity';

@Entity('user_profile_items')
@Index(['userId', 'itemId'], { unique: true })
@Index(['userId', 'isEquipped'])
export class UserProfileItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  itemId: number;

  @ManyToOne(() => ProfileItem)
  @JoinColumn({ name: 'itemId' })
  item: ProfileItem;

  @Column({
    type: 'enum',
    enum: ['PURCHASED', 'UNLOCKED', 'GIFTED', 'EVENT'],
  })
  source: string;

  @Column({ default: false })
  isEquipped: boolean;

  @CreateDateColumn()
  obtainedAt: Date;
}
