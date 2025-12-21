import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { PowerupType } from '../entity/powerup.entity';

export class PurchasePowerupDto {
  @IsString()
  powerupId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(['coins', 'cash'])
  paymentMethod: string;
}

export class UsePowerupDto {
  @IsString()
  userPowerupId: string;

  @IsString()
  @IsOptional()
  sessionId?: string; // Link to game session
}

export class GetPowerupsDto {
  @IsEnum(['all', 'available', 'used'])
  @IsOptional()
  filter?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class CreatePowerupDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(PowerupType)
  type: PowerupType;

  @IsNumber()
  @Min(0)
  coinPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cashPrice?: number;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsString()
  icon: string;

  @IsBoolean()
  @IsOptional()
  isStackable?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxUsesPerGame?: number;
}
