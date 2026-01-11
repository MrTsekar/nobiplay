import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VIPService } from '../service/vip.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';
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
    @CurrentUser() user: UserPayload,
    @Body() dto: SubscribeVIPDto,
  ) {
    return await this.vipService.subscribeVIP(user.userId, dto);
  }

  /**
   * Get subscription history
   * GET /vip/history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get subscription history' })
  async getSubscriptionHistory(
    @CurrentUser() user: UserPayload,
    @Query() dto: GetSubscriptionHistoryDto,
  ) {
    return await this.vipService.getSubscriptionHistory(user.userId, dto);
  }

  /**
   * Get active subscription
   * GET /vip/active
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active subscription' })
  async getActiveSubscription(@CurrentUser() user: UserPayload) {
    return await this.vipService.getActiveSubscription(user.userId);
  }

  /**
   * Get VIP limits for current user
   * GET /vip/limits
   */
  @Get('limits')
  @ApiOperation({ summary: 'Get VIP daily limits' })
  async getVIPLimits(@CurrentUser() user: UserPayload) {
    return await this.vipService.getVIPLimits(user.userId);
  }

  /**
   * Cancel subscription
   * POST /vip/cancel
   */
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel VIP subscription' })
  async cancelSubscription(
    @CurrentUser() user: UserPayload,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return await this.vipService.cancelSubscription(user.userId, dto);
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
