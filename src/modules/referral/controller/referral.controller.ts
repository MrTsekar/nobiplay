import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReferralService } from '../service/referral.service';
import { GetReferralStatsDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

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
  async getReferralStats(@CurrentUser() user: UserPayload, @Query() query: GetReferralStatsDto) {
    const result = await this.referralService.getReferralStats(user.userId, query);

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
