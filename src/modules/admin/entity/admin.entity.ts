import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  CONTENT_MANAGER = 'content_manager',
}

export enum AdminPermission {
  MANAGE_USERS = 'manage_users',
  MANAGE_CONTENT = 'manage_content',
  MANAGE_PAYMENTS = 'manage_payments',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_ADMINS = 'manage_admins',
  VIEW_TRANSACTIONS = 'view_transactions',
  MANAGE_SETTINGS = 'manage_settings',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  role: AdminRole;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  permissions?: AdminPermission[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLogin?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  resourceType?: string;

  @Column({ nullable: true })
  resourceId?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  changes?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}
