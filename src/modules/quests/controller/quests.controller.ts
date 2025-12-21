import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuestsService } from '../service/quests.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import {
  CreateQuestDto,
  GetUserQuestsDto,
  ClaimQuestRewardDto,
} from '../dto';

@ApiTags('Quests')
@ApiBearerAuth('JWT')
@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  /**
   * Get user's quests
   * GET /quests
   */
  @Get()
  @ApiOperation({ summary: 'Get user quests' })
  async getUserQuests(
    @Request() req: RequestWithUser,
    @Query() dto: GetUserQuestsDto,
  ) {
    return await this.questsService.getUserQuests(req.user.userId, dto);
  }

  /**
   * Get user quest statistics
   * GET /quests/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get quest statistics' })
  async getQuestStats(@Request() req: RequestWithUser) {
    return await this.questsService.getQuestStats(req.user.userId);
  }

  /**
   * Assign daily quests to user
   * POST /quests/daily/assign
   */
  @Post('daily/assign')
  @ApiOperation({ summary: 'Assign daily quests' })
  async assignDailyQuests(@Request() req: RequestWithUser) {
    return await this.questsService.assignDailyQuests(req.user.userId);
  }

  /**
   * Claim quest reward
   * POST /quests/claim
   */
  @Post('claim')
  @ApiOperation({ summary: 'Claim quest reward' })
  async claimQuestReward(
    @Request() req: RequestWithUser,
    @Body() dto: ClaimQuestRewardDto,
  ) {
    return await this.questsService.claimQuestReward(req.user.userId, dto);
  }

  /**
   * Get all available quests (admin)
   * GET /quests/all
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all quest templates' })
  async getAllQuests() {
    return await this.questsService.getAllQuests();
  }

  /**
   * Create new quest template (admin)
   * POST /quests/create
   */
  @Post('create')
  @ApiOperation({ summary: 'Create quest template' })
  async createQuest(@Body() dto: CreateQuestDto) {
    return await this.questsService.createQuest(dto);
  }
}
