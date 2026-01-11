import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { GamificationService } from '../service/gamification.service';
import {
  CreateSpinRewardDto,
  OpenMysteryBoxDto,
} from '../dto/gamification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

@ApiTags('Gamification')
@ApiBearerAuth('JWT')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
  ) {}

  /**
   * Get user streak
   * GET /gamification/streak
   */
  @Get('streak')
  async getUserStreak(@CurrentUser() user: UserPayload) {
    return await this.gamificationService.getUserStreak(user.userId);
  }

  /**
   * Spin the wheel
   * POST /gamification/spin
   */
  @Post('spin')
  async spinWheel(@CurrentUser() user: UserPayload) {
    return await this.gamificationService.spinWheel(user.userId);
  }

  /**
   * Get spin history
   * GET /gamification/spin/history?limit=20
   */
  @Get('spin/history')
  async getUserSpinHistory(
    @CurrentUser() user: UserPayload,
    @Query('limit') limit?: number,
  ) {
    return await this.gamificationService.getUserSpinHistory(
      user.userId,
      limit || 20,
    );
  }

  /**
   * Get spin wheel rewards
   * GET /gamification/spin/rewards
   */
  @Get('spin/rewards')
  async getSpinRewards() {
    return await this.gamificationService.getSpinRewards();
  }

  /**
   * Create spin reward (admin only)
   * POST /gamification/spin/rewards
   */
  @Post('spin/rewards')
  async createSpinReward(@Body() dto: CreateSpinRewardDto) {
    return await this.gamificationService.createSpinReward(dto);
  }

  /**
   * Get user's mystery boxes
   * GET /gamification/mystery-boxes
   */
  @Get('mystery-boxes')
  async getUserMysteryBoxes(@CurrentUser() user: UserPayload) {
    return await this.gamificationService.getUserMysteryBoxes(
      user.userId,
    );
  }

  /**
   * Open mystery box
   * POST /gamification/mystery-boxes/open
   */
  @Post('mystery-boxes/open')
  async openMysteryBox(@CurrentUser() user: UserPayload, @Body() dto: OpenMysteryBoxDto) {
    return await this.gamificationService.openMysteryBox(
      user.userId,
      dto.boxId,
    );
  }
}
