import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { QuestType, QuestFrequency, QuestDifficulty } from '../entity/quest.entity';

export class CreateQuestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(QuestType)
  type: QuestType;

  @IsEnum(QuestFrequency)
  frequency: QuestFrequency;

  @IsEnum(QuestDifficulty)
  @IsOptional()
  difficulty?: QuestDifficulty;

  @IsNumber()
  @Min(1)
  targetValue: number;

  @IsNumber()
  @Min(0)
  coinReward: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  xpReward?: number;

  @IsString()
  @IsOptional()
  bonusReward?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  orderPriority?: number;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsOptional()
  metadata?: any;
}

export class GetUserQuestsDto {
  @IsEnum(['active', 'completed', 'expired', 'claimed', 'all'])
  @IsOptional()
  status?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ClaimQuestRewardDto {
  @IsString()
  userQuestId: string;
}

export class QuestProgressDto {
  @IsEnum(QuestType)
  questType: QuestType;

  @IsNumber()
  @Min(1)
  progress: number;

  @IsOptional()
  metadata?: any;
}
