import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  MinLength,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminRole, AdminPermission } from '../entity/admin.entity';

// ==================== ADMIN MANAGEMENT ====================

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsEnum(AdminRole)
  role: AdminRole;

  @IsOptional()
  @IsArray()
  permissions?: AdminPermission[];
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsArray()
  permissions?: AdminPermission[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class GetAdminsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ==================== USER MANAGEMENT ====================

export class GetUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UserDetailResponseDto {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
}

// ==================== CONTENT MANAGEMENT ====================

export class CreateTriviaQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  options: string[];

  @IsNumber()
  @Min(0)
  @Max(3)
  correctAnswer: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  timeLimit?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTriviaQuestionDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  correctAnswer?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CreateMarketplaceItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  coinPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isLimited?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateMarketplaceItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  coinPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  displayOrder?: number;
}

export class BulkDeleteDto {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];
}

export class GetTriviaQuestionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetMarketplaceItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ==================== ANALYTICS & REPORTING ====================

export class GetAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month' | 'year';
}

export class GetDashboardStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  pendingWithdrawals: number;
  newUsersToday: number;
  totalPayments: number;
  avgUserValue: number;
}

// ==================== AUDIT LOGS ====================

export class GetAuditLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsUUID()
  adminId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
