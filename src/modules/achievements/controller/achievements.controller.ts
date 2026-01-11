import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AchievementsService } from '../service/achievements.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';
import {
  CreateAchievementDto,
  GetUserAchievementsDto,
  ClaimAchievementRewardDto,
} from '../dto';

@ApiTags('Achievements')
@ApiBearerAuth('JWT')
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /**
   * Get user's achievements
   * GET /achievements
   */
  @Get()
  @ApiOperation({ summary: 'Get user achievements' })
  async getUserAchievements(
    @CurrentUser() user: UserPayload,
    @Query() dto: GetUserAchievementsDto,
  ) {
    return await this.achievementsService.getUserAchievements(user.userId, dto);
  }

  /**
   * Get achievement statistics
   * GET /achievements/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get achievement statistics' })
  async getAchievementStats(@CurrentUser() user: UserPayload) {
    return await this.achievementsService.getAchievementStats(user.userId);
  }

  /**
   * Get achievement leaderboard
   * GET /achievements/leaderboard
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get achievement leaderboard' })
  async getAchievementLeaderboard(@Query('limit') limit?: number) {
    return await this.achievementsService.getAchievementLeaderboard(limit);
  }

  /**
   * Claim achievement reward
   * POST /achievements/claim
   */
  @Post('claim')
  @ApiOperation({ summary: 'Claim achievement reward' })
  async claimAchievementReward(
    @CurrentUser() user: UserPayload,
    @Body() dto: ClaimAchievementRewardDto,
  ) {
    return await this.achievementsService.claimAchievementReward(user.userId, dto);
  }

  /**
   * Get all available achievements (admin)
   * GET /achievements/all
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all achievement templates' })
  async getAllAchievements() {
    return await this.achievementsService.getAllAchievements();
  }

  /**
   * Create new achievement (admin)
   * POST /achievements/create
   */
  @Post('create')
  @ApiOperation({ summary: 'Create achievement template' })
  async createAchievement(@Body() dto: CreateAchievementDto) {
    return await this.achievementsService.createAchievement(dto);
  }
}
