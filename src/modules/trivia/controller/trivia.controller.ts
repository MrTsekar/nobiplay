import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TriviaService } from '../service/trivia.service';
import {
  StartTriviaSessionDto,
  SubmitAnswerDto,
  GetTriviaSessionsDto,
  CreateTriviaQuestionDto,
} from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Trivia')
@ApiBearerAuth('JWT')
@Controller('trivia')
@UseGuards(JwtAuthGuard)
export class TriviaController {
  constructor(private readonly triviaService: TriviaService) {}

  /**
   * Start a new trivia session
   * POST /trivia/session/start
   */
  @Post('session/start')
  @HttpCode(HttpStatus.OK)
  async startSession(@Request() req: RequestWithUser, @Body() dto: StartTriviaSessionDto) {
    const result = await this.triviaService.startSession(req.user.userId, dto);

    return {
      success: true,
      message: 'Trivia session started successfully',
      data: {
        sessionId: result.session.id,
        mode: result.session.mode,
        totalQuestions: result.session.totalQuestions,
        stakeAmount: Number(result.session.stakeAmount),
        questions: result.questions,
      },
    };
  }

  /**
   * Submit an answer
   * POST /trivia/session/answer
   */
  @Post('session/answer')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(@Request() req: RequestWithUser, @Body() dto: SubmitAnswerDto) {
    const result = await this.triviaService.submitAnswer(req.user.userId, dto);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Complete a trivia session
   * POST /trivia/session/:id/complete
   */
  @Post('session/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeSession(@Request() req: RequestWithUser, @Param('id') sessionId: string) {
    const result = await this.triviaService.completeSession(req.user.userId, sessionId);

    return {
      success: true,
      message: result.passed ? 'Congratulations! You passed!' : 'Session completed',
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
   * Get user's trivia sessions
   * GET /trivia/sessions
   */
  @Get('sessions')
  async getUserSessions(@Request() req: RequestWithUser, @Query() query: GetTriviaSessionsDto) {
    const result = await this.triviaService.getUserSessions(req.user.userId, query);

    return {
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    };
  }

  /**
   * Get session details
   * GET /trivia/session/:id
   */
  @Get('session/:id')
  async getSessionDetails(@Request() req: RequestWithUser, @Param('id') sessionId: string) {
    const result = await this.triviaService.getSessionDetails(req.user.userId, sessionId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get all categories
   * GET /trivia/categories
   */
  @Get('categories')
  async getCategories() {
    const categories = await this.triviaService.getCategories();

    return {
      success: true,
      data: categories,
    };
  }

  /**
   * Get all trivia packs
   * GET /trivia/packs
   */
  @Get('packs')
  async getTriviaPacks() {
    const packs = await this.triviaService.getTriviaPacks();

    return {
      success: true,
      data: packs,
    };
  }

  /**
   * Create user-generated trivia question
   * POST /trivia/question/create
   */
  @Post('question/create')
  @HttpCode(HttpStatus.CREATED)
  async createUserQuestion(@Request() req: RequestWithUser, @Body() dto: CreateTriviaQuestionDto) {
    const question = await this.triviaService.createUserQuestion(req.user.userId, dto);

    return {
      success: true,
      message: 'Your trivia question has been submitted for review',
      data: {
        questionId: question.id,
        isApproved: question.isApproved,
        isActive: question.isActive,
      },
    };
  }

  /**
   * Get user's trivia creation stats
   * GET /trivia/stats/creation
   */
  @Get('stats/creation')
  async getUserCreationStats(@Request() req: RequestWithUser) {
    const stats = await this.triviaService.getUserCreationStats(req.user.userId);

    return {
      success: true,
      data: stats,
    };
  }
}
