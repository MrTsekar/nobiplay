import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { DifficultyLevel } from '../entity/trivia-question.entity';
import { SessionMode } from '../entity/trivia-session.entity';

/**
 * DTO for starting a new trivia session
 */
export class StartTriviaSessionDto {
  @IsNotEmpty()
  @IsEnum(SessionMode)
  mode: SessionMode;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stakeAmount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  questionCount?: number = 10;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsString()
  tournamentId?: string;
}

/**
 * DTO for submitting an answer
 */
export class SubmitAnswerDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @IsNotEmpty()
  @IsString()
  questionId: string;

  @IsNotEmpty()
  @IsString()
  selectedAnswer: string;

  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

/**
 * DTO for completing a trivia session
 */
export class CompleteTriviaSessionDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;
}

/**
 * DTO for creating a new trivia question (user-generated content)
 */
export class CreateTriviaQuestionDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsNotEmpty()
  @IsString()
  correctAnswer: string;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel = DifficultyLevel.MEDIUM;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(120)
  timeLimit?: number = 30;

  @IsOptional()
  @IsNumber()
  pointsValue?: number = 10;

  @IsOptional()
  @IsString()
  explanation?: string;
}

/**
 * DTO for creating a new category (admin only)
 */
export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number = 0;
}

/**
 * DTO for creating a themed trivia pack
 */
export class CreateTriviaPackDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number = 0;

  @IsOptional()
  @IsBoolean()
  isSponsored?: boolean = false;

  @IsOptional()
  @IsString()
  sponsorName?: string;
}

/**
 * DTO for getting trivia sessions with filters
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
 * DTO for getting questions by category/pack
 */
export class GetQuestionsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
