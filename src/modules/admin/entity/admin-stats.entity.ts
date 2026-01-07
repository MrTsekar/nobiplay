import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum StatsType {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

@Entity("admin_stats")
@Index(["date", "type"], { unique: true })
export class AdminStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: string;

  @Column({
    type: "enum",
    enum: StatsType,
  })
  type: StatsType;

  // User Metrics
  @Column({ default: 0 })
  totalUsers: number;

  @Column({ default: 0 })
  newUsers: number;

  @Column({ default: 0 })
  activeUsers: number;

  @Column({ default: 0 })
  returningUsers: number;

  // Game Metrics
  @Column({ default: 0 })
  totalGames: number;

  @Column({ default: 0 })
  triviaGames: number;

  @Column({ default: 0 })
  lottoGames: number;

  @Column({ default: 0 })
  tournamentGames: number;

  // Revenue Metrics
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  coinPurchases: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  vipSubscriptions: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  marketplaceRevenue: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  powerupRevenue: number;

  // Engagement Metrics
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  avgSessionDuration: number; // minutes

  @Column({ default: 0 })
  totalSpins: number;

  @Column({ default: 0 })
  totalMysteryBoxes: number;

  @Column({ default: 0 })
  questsCompleted: number;

  @Column({ default: 0 })
  achievementsUnlocked: number;

  // Payout Metrics
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  coinsDistributed: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  cashWithdrawals: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  airtimeRedemptions: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  dataRedemptions: number;

  // Retention Metrics
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  d1Retention: number; // Day 1 retention %

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  d7Retention: number; // Day 7 retention %

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  d30Retention: number; // Day 30 retention %

  @CreateDateColumn()
  createdAt: Date;
}
