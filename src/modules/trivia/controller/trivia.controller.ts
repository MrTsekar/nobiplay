import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TriviaService } from '../service/trivia.service';
import {
  SubmitGameResultDto,
  GetTriviaSessionsDto,
  GetStatsDto,
  StartGameDto,
  VerifyDirectPaymentDto,
  GetTriviaQuestionsDto,
} from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';
import axios from 'axios';

@ApiTags('Trivia')
@ApiBearerAuth('JWT')
@Controller('trivia')
@UseGuards(JwtAuthGuard)
export class TriviaController {
  constructor(private readonly triviaService: TriviaService) {}

  /**
   * Get available trivia categories
   * GET /trivia/categories
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get trivia categories from Open Trivia DB' })
  async getCategories() {
    const categories = await this.triviaService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  /**
   * Get pricing for trivia game
   * GET /trivia/pricing
   */
  @Get('pricing')
  @ApiOperation({ summary: 'Get trivia game pricing' })
  async getPricing(
    @Query('questions') questions?: number,
    @Query('difficulty') difficulty?: string,
  ) {
    const pricing = await this.triviaService.calculatePricing(
      questions ? parseInt(questions.toString()) : undefined,
      difficulty,
    );
    return {
      success: true,
      data: pricing,
    };
  }

  /**
   * Start a new trivia game session
   * POST /trivia/start-game
   */
  @Post('start-game')
  @ApiOperation({ summary: 'Start a new game session with payment' })
  async startGame(@CurrentUser() user: UserPayload, @Body() dto: StartGameDto) {
    const result = await this.triviaService.startGameSession(user.userId, dto);
    return {
      success: true,
      message: result.paymentType === 'direct' 
        ? 'Complete payment to start game'
        : 'Game session created',
      data: result,
    };
  }

  /**
   * Verify direct payment and activate session
   * POST /trivia/verify-payment
   */
  @Post('verify-payment')
  @ApiOperation({ summary: 'Verify direct payment for game session' })
  async verifyPayment(@CurrentUser() user: UserPayload, @Body() dto: VerifyDirectPaymentDto) {
    const result = await this.triviaService.verifyDirectPayment(
      user.userId,
      dto.sessionToken,
      dto.paymentReference,
    );
    return {
      success: true,
      message: 'Payment verified, game ready to start',
      data: result,
    };
  }

  /**
   * Get questions for active session
   * GET /trivia/questions
   */
  @Get('questions')
  @ApiOperation({ summary: 'Get trivia questions for active session' })
  async getQuestions(
    @CurrentUser() user: UserPayload,
    @Query() query: GetTriviaQuestionsDto,
  ) {
    const result = await this.triviaService.getQuestionsForSession(
      user.userId,
      query.sessionToken,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Submit game result from frontend
   * POST /trivia/submit-result
   * 
   * New flow:
   * 1. User starts game via /start-game (payment handled)
   * 2. Frontend fetches questions via /questions (with session token)
   * 3. User plays game in frontend
   * 4. Frontend submits final results here with session token
   * 5. Backend validates session, awards rewards
   */
  @Post('submit-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit game result with session validation' })
  async submitGameResult(@CurrentUser() user: UserPayload, @Body() dto: SubmitGameResultDto) {
    // Validate DTO has sessionToken
    if (!dto.sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    const result = await this.triviaService.submitGameResult(user.userId, dto);

    return {
      success: true,
      message: result.passed ? 'Congratulations! You passed!' : 'Game completed',
      data: {
        sessionId: result.session.id,
        totalQuestions: result.session.totalQuestions,
        correctAnswers: result.session.correctAnswers,
        wrongAnswers: result.session.wrongAnswers,
        accuracy: result.accuracy,
        coinsEarned: Number(result.coinsEarned),
        xpEarned: result.xpEarned,
        passed: result.passed,
        timeTaken: result.session.timeTaken,
      },
    };
  }

  /**
   * Get user's game history
   * GET /trivia/history
   */
  @Get('history')
  async getUserSessions(@CurrentUser() user: UserPayload, @Query() query: GetTriviaSessionsDto) {
    const result = await this.triviaService.getUserSessions(user.userId, query);

    return {
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    };
  }

  /**
   * Get user's trivia statistics
   * GET /trivia/stats
   */
  @Get('stats')
  async getUserStats(@CurrentUser() user: UserPayload, @Query() query: GetStatsDto) {
    const stats = await this.triviaService.getUserStats(user.userId, query);

    return {
      success: true,
      data: stats,
    };
  }
}
