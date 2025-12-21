import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TriviaService } from '../service/trivia.service';
import {
  SubmitGameResultDto,
  GetTriviaSessionsDto,
  GetStatsDto,
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
   * Submit game result from frontend
   * POST /trivia/submit-result
   * 
   * Frontend flow:
   * 1. Fetch questions from external API (e.g., Open Trivia DB)
   * 2. User plays game in frontend
   * 3. Frontend submits final results here
   * 4. Backend validates, awards coins/XP, updates stats
   */
  @Post('submit-result')
  @HttpCode(HttpStatus.OK)
  async submitGameResult(@Request() req: RequestWithUser, @Body() dto: SubmitGameResultDto) {
    const result = await this.triviaService.submitGameResult(req.user.userId, dto);

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
  async getUserSessions(@Request() req: RequestWithUser, @Query() query: GetTriviaSessionsDto) {
    const result = await this.triviaService.getUserSessions(req.user.userId, query);

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
  async getUserStats(@Request() req: RequestWithUser, @Query() query: GetStatsDto) {
    const stats = await this.triviaService.getUserStats(req.user.userId, query);

    return {
      success: true,
      data: stats,
    };
  }
}
