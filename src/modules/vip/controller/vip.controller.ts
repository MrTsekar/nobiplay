import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VIPService } from '../service/vip.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import {
  SubscribeVIPDto,
  GetSubscriptionHistoryDto,
  CancelSubscriptionDto,
} from '../dto';

@ApiTags('VIP')
@ApiBearerAuth('JWT')
@Controller('vip')
@UseGuards(JwtAuthGuard)
export class VIPController {
  constructor(private readonly vipService: VIPService) {}

  /**
   * Get all VIP tiers and benefits
   * GET /vip/tiers
   */
  @Get('tiers')
  @ApiOperation({ summary: 'Get all VIP tiers' })
  async getVIPTiers() {
    return await this.vipService.getAllVIPTiers();
  }

  /**
   * Subscribe to VIP tier
   * POST /vip/subscribe
   */
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to VIP tier' })
  async subscribeVIP(
    @Request() req: RequestWithUser,
    @Body() dto: SubscribeVIPDto,
  ) {
    return await this.vipService.subscribeVIP(req.user.userId, dto);
  }

  /**
   * Get subscription history
   * GET /vip/history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get subscription history' })
  async getSubscriptionHistory(
    @Request() req: RequestWithUser,
    @Query() dto: GetSubscriptionHistoryDto,
  ) {
    return await this.vipService.getSubscriptionHistory(req.user.userId, dto);
  }

  /**
   * Get active subscription
   * GET /vip/active
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active subscription' })
  async getActiveSubscription(@Request() req: RequestWithUser) {
    return await this.vipService.getActiveSubscription(req.user.userId);
  }

  /**
   * Get VIP limits for current user
   * GET /vip/limits
   */
  @Get('limits')
  @ApiOperation({ summary: 'Get VIP daily limits' })
  async getVIPLimits(@Request() req: RequestWithUser) {
    return await this.vipService.getVIPLimits(req.user.userId);
  }

  /**
   * Cancel subscription
   * POST /vip/cancel
   */
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel VIP subscription' })
  async cancelSubscription(
    @Request() req: RequestWithUser,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return await this.vipService.cancelSubscription(req.user.userId, dto);
  }

  /**
   * Get VIP statistics (admin)
   * GET /vip/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get VIP statistics' })
  async getVIPStats() {
    return await this.vipService.getVIPStats();
  }
}
