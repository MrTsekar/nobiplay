import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AvatarRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum UnlockMethod {
  PURCHASE = 'PURCHASE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  VIP = 'VIP',
  EVENT = 'EVENT',
  DEFAULT = 'DEFAULT',
}

@Entity('avatars')
@Index(['rarity'])
@Index(['isActive'])
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: AvatarRarity,
    default: AvatarRarity.COMMON,
  })
  rarity: AvatarRarity;

  @Column({
    type: 'enum',
    enum: UnlockMethod,
    default: UnlockMethod.PURCHASE,
  })
  unlockMethod: UnlockMethod;

  @Column({ default: 0 })
  coinPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cashPrice: number;

  @Column({ nullable: true })
  requiredAchievementId?: number;

  @Column({ nullable: true })
  requiredVipTier?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @Column('simple-json', { nullable: true })
  metadata?: {
    tags?: string[];
    artist?: string;
    collection?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
