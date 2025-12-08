import {
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  Min,
  Max,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DrawFrequency } from '../entity/lotto-draw.entity';

export class CreateLottoDrawDto {
  @IsString()
  name: string;

  @IsEnum(DrawFrequency)
  frequency: DrawFrequency;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  entryCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  maxEntriesPerUser?: number = 10;

  @Type(() => Date)
  @IsDate()
  drawTime: Date;

  @Type(() => Date)
  @IsDate()
  closesAt: Date;
}

export class EnterLottoDto {
  @IsUUID()
  drawId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  numberOfEntries: number;
}
