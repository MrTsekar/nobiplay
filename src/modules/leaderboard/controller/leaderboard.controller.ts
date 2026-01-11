import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from '../service/leaderboard.service';
import { GetLeaderboardDto, GetTopPerformersDto } from '../dto/leaderboard.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

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
  async getLeaderboard(@CurrentUser() user: UserPayload, @Query() dto: GetLeaderboardDto) {
    return await this.leaderboardService.getLeaderboard(user.userId, dto);
  }

  /**
   * Get all leaderboard positions for current user
   * GET /leaderboard/me
   */
  @Get('me')
  async getMyLeaderboards(@CurrentUser() user: UserPayload) {
    return await this.leaderboardService.getUserLeaderboards(user.userId);
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
