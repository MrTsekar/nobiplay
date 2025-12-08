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
import { LottoService } from '../service/lotto.service';
import { CreateLottoDrawDto, EnterLottoDto } from '../dto/lotto.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Lotto')
@ApiBearerAuth('JWT')
@Controller('lotto')
@UseGuards(JwtAuthGuard)
export class LottoController {
  constructor(private readonly lottoService: LottoService) {}

  /**
   * Create a new lotto draw (admin only)
   * POST /lotto/draws
   */
  @Post('draws')
  async createDraw(@Body() dto: CreateLottoDrawDto) {
    return await this.lottoService.createDraw(dto);
  }

  /**
   * Get all active lotto draws
   * GET /lotto/draws/active
   */
  @Get('draws/active')
  async getActiveDraws() {
    return await this.lottoService.getActiveDraws();
  }

  /**
   * Get lotto draw details
   * GET /lotto/draws/:id
   */
  @Get('draws/:id')
  async getDrawDetails(@Param('id') id: string) {
    return await this.lottoService.getDrawDetails(id);
  }

  /**
   * Enter the lotto
   * POST /lotto/enter
   */
  @Post('enter')
  async enterLotto(@Request() req: RequestWithUser, @Body() dto: EnterLottoDto) {
    return await this.lottoService.enterLotto(req.user.id, dto);
  }

  /**
   * Get user's lotto entries
   * GET /lotto/entries/me?drawId=xxx
   */
  @Get('entries/me')
  async getUserEntries(@Request() req: RequestWithUser, @Query('drawId') drawId?: string) {
    return await this.lottoService.getUserEntries(req.user.id, drawId);
  }

  /**
   * Get recent winners
   * GET /lotto/winners?limit=10
   */
  @Get('winners')
  async getRecentWinners(@Query('limit') limit?: number) {
    return await this.lottoService.getRecentWinners(limit || 10);
  }

  /**
   * Conduct draw (admin only)
   * POST /lotto/draws/:id/conduct
   */
  @Post('draws/:id/conduct')
  async conductDraw(@Param('id') id: string) {
    return await this.lottoService.conductDraw(id);
  }
}
