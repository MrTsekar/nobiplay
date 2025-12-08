import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from '../service/leaderboard.service';
import { GetLeaderboardDto, GetTopPerformersDto } from '../dto/leaderboard.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Leaderboard')
@ApiBearerAuth('JWT')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Get leaderboard with user position
   * GET /leaderboard?type=global&period=weekly
   */
  @Get()
  async getLeaderboard(@Request() req: RequestWithUser, @Query() dto: GetLeaderboardDto) {
    return await this.leaderboardService.getLeaderboard(req.user.id, dto);
  }

  /**
   * Get all leaderboard positions for current user
   * GET /leaderboard/me
   */
  @Get('me')
  async getMyLeaderboards(@Request() req: RequestWithUser) {
    return await this.leaderboardService.getUserLeaderboards(req.user.id);
  }

  /**
   * Get top performers
   * GET /leaderboard/top?type=tribe&period=weekly&scope=yoruba
   */
  @Get('top')
  async getTopPerformers(@Query() dto: GetTopPerformersDto) {
    return await this.leaderboardService.getTopPerformers(dto);
  }
}
