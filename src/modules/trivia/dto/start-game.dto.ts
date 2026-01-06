import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { SessionMode } from '../entity/trivia-session.entity';
import { PaymentType } from '../entity/active-game-session.entity';

export class StartGameDto {
  @IsNotEmpty()
  @IsEnum(SessionMode)
  mode: SessionMode;

  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(50)
  totalQuestions: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: string;

  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType; // 'wallet' or 'direct'

  @IsOptional()
  @IsString()
  tournamentId?: string;
}

export class VerifyDirectPaymentDto {
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @IsNotEmpty()
  @IsString()
  paymentReference: string;
}

export class GetTriviaQuestionsDto {
  @IsNotEmpty()
  @IsString()
  sessionToken: string;
}
