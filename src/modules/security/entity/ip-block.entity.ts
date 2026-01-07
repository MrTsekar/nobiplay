import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("ip_blocks")
@Index(["ipAddress"])
@Index(["isActive"])
@Index(["expiresAt"])
export class IpBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ipAddress: string;

  @Column()
  reason: string;

  @Column({ nullable: true })
  blockedBy?: string; // Admin ID

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date;

  @Column("simple-json", { nullable: true })
  metadata?: {
    country?: string;
    attempts?: number;
    violations?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
