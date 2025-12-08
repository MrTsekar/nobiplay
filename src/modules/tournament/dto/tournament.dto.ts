import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDate,
  Min,
  Max,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TournamentType, TournamentStatus } from '../entity/tournament.entity';
import { BetType } from '../entity/tournament-bet.entity';

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TournamentType)
  type: TournamentType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entryFee: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prizePool: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(50)
  totalQuestions?: number = 15;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(120)
  questionTimeLimit?: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  livesPerPlayer?: number = 3;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @Type(() => Date)
  @IsDate()
  registrationOpensAt: Date;

  @Type(() => Date)
  @IsDate()
  registrationClosesAt: Date;

  @IsOptional()
  @IsString()
  banner?: string;
}

export class GetTournamentsDto {
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;
}

export class BetPrediction {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;
}

export class PlaceBetDto {
  @IsUUID()
  tournamentId: string;

  @IsEnum(BetType)
  type: BetType;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  stakeAmount: number;

  @ValidateNested()
  @Type(() => BetPrediction)
  @IsObject()
  prediction: BetPrediction;
}
