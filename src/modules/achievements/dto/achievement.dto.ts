import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { AchievementType, AchievementTier } from '../entity/achievement.entity';

export class CreateAchievementDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(AchievementType)
  type: AchievementType;

  @IsEnum(AchievementTier)
  tier: AchievementTier;

  @IsNumber()
  @Min(1)
  requiredValue: number;

  @IsString()
  icon: string;

  @IsNumber()
  @Min(0)
  coinReward: number;

  @IsNumber()
  @Min(0)
  xpReward: number;

  @IsString()
  @IsOptional()
  badgeUrl?: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsOptional()
  metadata?: any;
}

export class GetUserAchievementsDto {
  @IsEnum(['all', 'unlocked', 'locked'])
  @IsOptional()
  filter?: string;

  @IsEnum(['progress', 'tier', 'recent'])
  @IsOptional()
  sortBy?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ClaimAchievementRewardDto {
  @IsString()
  userAchievementId: string;
}

export class AchievementProgressDto {
  @IsEnum(AchievementType)
  achievementType: AchievementType;

  @IsNumber()
  @Min(1)
  progress: number;

  @IsOptional()
  metadata?: any;
}
