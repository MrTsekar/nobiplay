import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReferralService } from '../service/referral.service';
import { GetReferralStatsDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Referral')
@ApiBearerAuth('JWT')
@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * Get user's referral statistics
   * GET /referral/stats
   */
  @Get('stats')
  async getReferralStats(@Request() req: RequestWithUser, @Query() query: GetReferralStatsDto) {
    const result = await this.referralService.getReferralStats(req.user.userId, query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get top referrers leaderboard
   * GET /referral/leaderboard
   */
  @Get('leaderboard')
  async getTopReferrers() {
    const result = await this.referralService.getTopReferrers(10);

    return {
      success: true,
      data: result,
    };
  }
}
