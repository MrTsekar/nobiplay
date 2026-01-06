import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { SessionMode } from '../entity/trivia-session.entity';

/**
 * DTO for submitting game results from frontend
 * Frontend handles entire session using external trivia API
 */
export class SubmitGameResultDto {
  @IsNotEmpty()
  @IsString()
  sessionToken: string; // Required - validates game session

  @IsNotEmpty()
  @IsEnum(SessionMode)
  mode: SessionMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stakeAmount?: number = 0;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(50)
  totalQuestions: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  correctAnswers: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  wrongAnswers: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeTaken?: number; // Total time in seconds

  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsString()
  category?: string; // From trivia API

  @IsOptional()
  @IsString()
  difficulty?: string; // From trivia API
}

/**
 * DTO for getting user's session history
 */
export class GetTriviaSessionsDto {
  @IsOptional()
  @IsEnum(SessionMode)
  mode?: SessionMode;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for getting statistics
 */
export class GetStatsDto {
  @IsOptional()
  @IsEnum(SessionMode)
  mode?: SessionMode;

  @IsOptional()
  @IsString()
  period?: 'today' | 'week' | 'month' | 'all' = 'all';
}
