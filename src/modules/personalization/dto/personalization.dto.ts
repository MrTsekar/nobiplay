import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfileItemType } from '../entity/profile-item.entity';

export class PurchaseAvatarDto {
  @IsNumber()
  avatarId: number;

  @IsEnum(['COINS', 'CASH'])
  paymentMethod: 'COINS' | 'CASH';
}

export class PurchaseProfileItemDto {
  @IsNumber()
  itemId: number;

  @IsEnum(['COINS', 'CASH'])
  paymentMethod: 'COINS' | 'CASH';
}

export class EquipAvatarDto {
  @IsNumber()
  avatarId: number;
}

export class EquipProfileItemDto {
  @IsNumber()
  itemId: number;
}

export class GetAvatarsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class GetProfileItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(['BANNER', 'FRAME', 'ANIMATION', 'SOUND_PACK', 'TITLE', 'BADGE'])
  type?: ProfileItemType;

  @IsOptional()
  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class CreateAvatarDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  imageUrl: string;

  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity: string;

  @IsEnum(['PURCHASE', 'ACHIEVEMENT', 'VIP', 'EVENT', 'DEFAULT'])
  unlockMethod: string;

  @IsNumber()
  @Min(0)
  coinPrice: number;

  @IsNumber()
  @Min(0)
  cashPrice: number;

  @IsOptional()
  @IsNumber()
  requiredAchievementId?: number;

  @IsOptional()
  @IsString()
  requiredVipTier?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    tags?: string[];
    artist?: string;
    collection?: string;
  };
}

export class CreateProfileItemDto {
  @IsEnum(['BANNER', 'FRAME', 'ANIMATION', 'SOUND_PACK', 'TITLE', 'BADGE'])
  type: ProfileItemType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assetUrl?: string;

  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity: string;

  @IsNumber()
  @Min(0)
  coinPrice: number;

  @IsNumber()
  @Min(0)
  cashPrice: number;

  @IsOptional()
  @IsNumber()
  requiredLevel?: number;

  @IsOptional()
  @IsString()
  requiredVipTier?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    color?: string;
    duration?: number;
    sounds?: string[];
    effects?: string[];
  };
}
