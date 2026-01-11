import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PowerupsService } from '../service/powerups.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';
import {
  PurchasePowerupDto,
  UsePowerupDto,
  GetPowerupsDto,
  CreatePowerupDto,
} from '../dto';

@ApiTags('Powerups')
@ApiBearerAuth('JWT')
@Controller('powerups')
@UseGuards(JwtAuthGuard)
export class PowerupsController {
  constructor(private readonly powerupsService: PowerupsService) {}

  /**
   * Get all available powerups
   * GET /powerups
   */
  @Get()
  @ApiOperation({ summary: 'Get all available powerups' })
  async getAllPowerups() {
    return await this.powerupsService.getAllPowerups();
  }

  /**
   * Get user's powerup inventory
   * GET /powerups/inventory
   */
  @Get('inventory')
  @ApiOperation({ summary: 'Get powerup inventory' })
  async getUserPowerups(
    @CurrentUser() user: UserPayload,
    @Query() dto: GetPowerupsDto,
  ) {
    return await this.powerupsService.getUserPowerups(user.userId, dto);
  }

  /**
   * Get powerup statistics
   * GET /powerups/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get powerup statistics' })
  async getPowerupStats(@CurrentUser() user: UserPayload) {
    return await this.powerupsService.getPowerupStats(user.userId);
  }

  /**
   * Purchase powerup
   * POST /powerups/purchase
   */
  @Post('purchase')
  @ApiOperation({ summary: 'Purchase powerup' })
  async purchasePowerup(
    @CurrentUser() user: UserPayload,
    @Body() dto: PurchasePowerupDto,
  ) {
    return await this.powerupsService.purchasePowerup(user.userId, dto);
  }

  /**
   * Use powerup
   * POST /powerups/use
   */
  @Post('use')
  @ApiOperation({ summary: 'Use powerup' })
  async usePowerup(
    @CurrentUser() user: UserPayload,
    @Body() dto: UsePowerupDto,
  ) {
    return await this.powerupsService.usePowerup(user.userId, dto);
  }

  /**
   * Create powerup (admin)
   * POST /powerups/create
   */
  @Post('create')
  @ApiOperation({ summary: 'Create powerup' })
  async createPowerup(@Body() dto: CreatePowerupDto) {
    return await this.powerupsService.createPowerup(dto);
  }
}
