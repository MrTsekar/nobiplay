import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaderboardType, LeaderboardPeriod } from '../entity/leaderboard-entry.entity';

export class GetLeaderboardDto {
  @IsEnum(LeaderboardType)
  type: LeaderboardType;

  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export class GetTopPerformersDto {
  @IsEnum(LeaderboardType)
  type: LeaderboardType;

  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
