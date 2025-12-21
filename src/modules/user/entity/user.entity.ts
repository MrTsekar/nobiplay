import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Wallet } from '../../wallet/entity/wallet.entity';
import { TriviaSession } from '../../trivia/entity/trivia-session.entity';
import { Referral } from '../../referral/entity/referral.entity';

export enum UserRank {
  ROOKIE = 'rookie',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  LEGEND = 'legend',
}

export enum VIPTier {
  FREE = 'free',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ name: 'pin_hash' })
  pinHash: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'bank_account', nullable: true })
  bankAccount?: string;

  @Column({ name: 'bank_code', nullable: true })
  bankCode?: string;

  @Column({
    type: 'enum',
    enum: UserRank,
    default: UserRank.ROOKIE,
  })
  rank: UserRank;

  @Column({ name: 'referral_code', unique: true })
  referralCode: string;

  @Column({ name: 'referred_by', nullable: true })
  referredBy?: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ name: 'total_games_played', default: 0 })
  totalGamesPlayed: number;

  @Column({ name: 'total_wins', default: 0 })
  totalWins: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_played_at', nullable: true })
  lastPlayedAt?: Date;

  @Column({ nullable: true })
  tribe?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  campus?: string;

  @Column({
    type: 'enum',
    enum: VIPTier,
    default: VIPTier.FREE,
    name: 'vip_tier',
  })
  vipTier: VIPTier;

  @Column({ name: 'vip_expires_at', nullable: true })
  vipExpiresAt?: Date;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => TriviaSession, (session) => session.user)
  triviaSessions: TriviaSession[];

  @OneToMany(() => Referral, (referral) => referral.referrer)
  referralsMade: Referral[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
