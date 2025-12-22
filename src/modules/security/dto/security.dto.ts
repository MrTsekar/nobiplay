import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SecurityEventType, SeverityLevel } from '../entity/security-log.entity';
import { FraudAlertType, AlertStatus } from '../entity/fraud-alert.entity';

export class BlockIpDto {
  @IsString()
  ipAddress: string;

  @IsString()
  reason: string;

  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: {
    country?: string;
    attempts?: number;
    violations?: string[];
  };
}

export class UnblockIpDto {
  @IsString()
  ipAddress: string;
}

export class LogSecurityEventDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsEnum(SecurityEventType)
  eventType: SecurityEventType;

  @IsEnum(SeverityLevel)
  severity: SeverityLevel;

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    userAgent?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    errorMessage?: string;
    attemptCount?: number;
    fingerprintId?: string;
  };

  @IsOptional()
  @IsBoolean()
  flaggedForReview?: boolean;
}

export class CreateFraudAlertDto {
  @IsNumber()
  userId: number;

  @IsEnum(FraudAlertType)
  alertType: FraudAlertType;

  @IsNumber()
  riskScore: number;

  @IsString()
  description: string;

  @IsObject()
  evidence: {
    ipAddresses?: string[];
    devices?: string[];
    transactionIds?: number[];
    patterns?: string[];
    locations?: string[];
    timeframe?: string;
  };
}

export class UpdateFraudAlertDto {
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsBoolean()
  actionTaken?: boolean;
}

export class GetSecurityLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsEnum(SecurityEventType)
  eventType?: SecurityEventType;

  @IsOptional()
  @IsEnum(SeverityLevel)
  severity?: SeverityLevel;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  flaggedForReview?: boolean;
}

export class GetFraudAlertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsEnum(FraudAlertType)
  alertType?: FraudAlertType;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRiskScore?: number;
}

export class CreateSessionDto {
  @IsNumber()
  userId: number;

  @IsString()
  sessionToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @Type(() => Date)
  expiresAt: Date;

  @IsOptional()
  @IsObject()
  metadata?: {
    loginMethod?: string;
    location?: string;
    deviceType?: string;
  };
}
