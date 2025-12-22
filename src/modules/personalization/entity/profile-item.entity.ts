import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ProfileItemType {
  BANNER = 'BANNER',
  FRAME = 'FRAME',
  ANIMATION = 'ANIMATION',
  SOUND_PACK = 'SOUND_PACK',
  TITLE = 'TITLE',
  BADGE = 'BADGE',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

@Entity('profile_items')
@Index(['type', 'isActive'])
@Index(['rarity'])
export class ProfileItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ProfileItemType,
  })
  type: ProfileItemType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  assetUrl?: string;

  @Column({
    type: 'enum',
    enum: ItemRarity,
    default: ItemRarity.COMMON,
  })
  rarity: ItemRarity;

  @Column({ default: 0 })
  coinPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cashPrice: number;

  @Column({ nullable: true })
  requiredLevel?: number;

  @Column({ nullable: true })
  requiredVipTier?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @Column('simple-json', { nullable: true })
  metadata?: {
    color?: string;
    duration?: number; // for animations
    sounds?: string[]; // for sound packs
    effects?: string[]; // for animations
  };

  @CreateDateColumn()
  createdAt: Date;
}
