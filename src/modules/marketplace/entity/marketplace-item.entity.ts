import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum ItemType {
  AIRTIME = 'airtime',
  DATA = 'data',
  CASH_WITHDRAWAL = 'cash_withdrawal',
  CRYPTO = 'crypto',
  TOURNAMENT_PASS = 'tournament_pass',
  VOUCHER = 'voucher',
  THEMED_PACK = 'themed_pack',
}

@Entity('marketplace_items')
export class MarketplaceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  type: ItemType;

  @Column({ name: 'coin_price', type: 'decimal', precision: 10, scale: 2 })
  coinPrice: number;

  @Column({ name: 'cash_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashValue?: number;

  @Column({ name: 'stock_quantity', nullable: true })
  stockQuantity?: number;

  @Column({ name: 'is_limited', default: false })
  isLimited: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  icon?: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'total_redeemed', default: 0 })
  totalRedeemed: number;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
