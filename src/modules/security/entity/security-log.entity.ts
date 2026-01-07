import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum SecurityEventType {
  LOGIN_ATTEMPT = "LOGIN_ATTEMPT",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MULTIPLE_ACCOUNTS = "MULTIPLE_ACCOUNTS",
  UNUSUAL_TRANSACTION = "UNUSUAL_TRANSACTION",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  IP_BLOCKED = "IP_BLOCKED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
}

export enum SeverityLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

@Entity("security_logs")
@Index(["userId"])
@Index(["ipAddress"])
@Index(["eventType"])
@Index(["severity"])
@Index(["createdAt"])
export class SecurityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({
    type: "enum",
    enum: SecurityEventType,
  })
  eventType: SecurityEventType;

  @Column({
    type: "enum",
    enum: SeverityLevel,
    default: SeverityLevel.LOW,
  })
  severity: SeverityLevel;

  @Column("text")
  description: string;

  @Column("simple-json", { nullable: true })
  metadata?: {
    userAgent?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    errorMessage?: string;
    attemptCount?: number;
    fingerprintId?: string;
  };

  @Column({ default: false })
  flaggedForReview: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
