import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TournamentService } from '../service/tournament.service';
import {
  CreateTournamentDto,
  GetTournamentsDto,
  PlaceBetDto,
} from '../dto/tournament.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
@ApiTags('Tournament')
@ApiBearerAuth('JWT')
@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  /**
   * Create a new tournament (admin only)
   * POST /tournaments
   */
  @Post()
  async createTournament(@Body() dto: CreateTournamentDto) {
    return await this.tournamentService.createTournament(dto);
  }

  /**
   * Get all tournaments
   * GET /tournaments?status=upcoming&type=paid
   */
  @Get()
  async getTournaments(@Query() filters: GetTournamentsDto) {
    return await this.tournamentService.getTournaments(filters);
  }

  /**
   * Get tournament details
   * GET /tournaments/:id
   */
  @Get(':id')
  async getTournamentDetails(@Param('id') id: string) {
    return await this.tournamentService.getTournamentDetails(id);
  }

  /**
   * Register for tournament
   * POST /tournaments/:id/register
   */
  @Post(':id/register')
  async registerForTournament(@Request() req: RequestWithUser, @Param('id') id: string) {
    return await this.tournamentService.registerForTournament(req.user.userId, id);
  }

  /**
   * Get tournament leaderboard
   * GET /tournaments/:id/leaderboard
   */
  @Get(':id/leaderboard')
  async getTournamentLeaderboard(@Param('id') id: string) {
    return await this.tournamentService.getTournamentLeaderboard(id);
  }

  /**
   * Place a bet on tournament outcome
   * POST /tournaments/bets
   */
  @Post('bets')
  async placeBet(@Request() req: RequestWithUser, @Body() dto: PlaceBetDto) {
    return await this.tournamentService.placeBet(req.user.userId, dto);
  }

  /**
   * Get user's bets
   * GET /tournaments/bets/me?tournamentId=xxx
   */
  @Get('bets/me')
  async getUserBets(@Request() req: RequestWithUser, @Query('tournamentId') tournamentId?: string) {
    return await this.tournamentService.getUserBets(req.user.userId, tournamentId);
  }
}
