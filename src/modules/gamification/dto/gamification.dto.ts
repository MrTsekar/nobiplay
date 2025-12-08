import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RewardType } from '../entity/spin-wheel-reward.entity';

export class CreateSpinRewardDto {
  @IsString()
  name: string;

  @IsEnum(RewardType)
  type: RewardType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  probabilityWeight: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  displayOrder?: number = 0;
}

export class OpenMysteryBoxDto {
  @IsUUID()
  boxId: string;
}
