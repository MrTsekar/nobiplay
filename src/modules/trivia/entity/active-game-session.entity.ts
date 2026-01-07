import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum PaymentType {
  WALLET = "wallet",
  DIRECT = "direct",
}

export enum GameSessionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
  ABANDONED = "abandoned",
}

@Entity("active_game_sessions")
@Index(["userId", "status"])
@Index(["expiresAt"])
export class ActiveGameSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ unique: true, name: "session_token" })
  sessionToken: string;

  @Column({
    type: "enum",
    enum: GameSessionStatus,
    default: GameSessionStatus.ACTIVE,
  })
  status: GameSessionStatus;

  @Column({ type: "varchar", length: 50 })
  mode: string;

  @Column({ type: "int", name: "total_questions" })
  totalQuestions: number;

  @Column({ type: "varchar", nullable: true })
  category?: string;

  @Column({ type: "varchar", nullable: true })
  difficulty?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, name: "entry_fee" })
  entryFee: number;

  @Column({
    type: "enum",
    enum: PaymentType,
    name: "payment_type",
  })
  paymentType: PaymentType;

  @Column({ type: "varchar", nullable: true, name: "payment_reference" })
  paymentReference?: string; // For direct payments

  @Column({ type: "boolean", default: false, name: "payment_verified" })
  paymentVerified: boolean;

  @Column({ type: "timestamp", name: "expires_at" })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true, name: "started_at" })
  startedAt?: Date;

  @Column({ type: "timestamp", nullable: true, name: "completed_at" })
  completedAt?: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
