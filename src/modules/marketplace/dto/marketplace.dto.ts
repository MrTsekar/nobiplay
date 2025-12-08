import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType } from '../entity/marketplace-item.entity';

export class CreateMarketplaceItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ItemType)
  type: ItemType;

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
  isLimited?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  displayOrder?: number = 0;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RedeemItemDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  cryptoAddress?: string;
}

export class GetMarketplaceItemsDto {
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
