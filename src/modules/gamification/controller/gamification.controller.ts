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
import { GamificationService } from '../service/gamification.service';
import {
  CreateSpinRewardDto,
  OpenMysteryBoxDto,
} from '../dto/gamification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

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
  async getUserStreak(@Request() req: RequestWithUser) {
    return await this.gamificationService.getUserStreak(req.user.id);
  }

  /**
   * Spin the wheel
   * POST /gamification/spin
   */
  @Post('spin')
  async spinWheel(@Request() req: RequestWithUser) {
    return await this.gamificationService.spinWheel(req.user.id);
  }

  /**
   * Get spin history
   * GET /gamification/spin/history?limit=20
   */
  @Get('spin/history')
  async getUserSpinHistory(
    @Request() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    return await this.gamificationService.getUserSpinHistory(
      req.user.id,
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
  async getUserMysteryBoxes(@Request() req: RequestWithUser) {
    return await this.gamificationService.getUserMysteryBoxes(
      req.user.id,
    );
  }

  /**
   * Open mystery box
   * POST /gamification/mystery-boxes/open
   */
  @Post('mystery-boxes/open')
  async openMysteryBox(@Request() req: RequestWithUser, @Body() dto: OpenMysteryBoxDto) {
    return await this.gamificationService.openMysteryBox(
      req.user.id,
      dto.boxId,
    );
  }
}
