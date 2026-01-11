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
import { MarketplaceService } from '../service/marketplace.service';
import {
  CreateMarketplaceItemDto,
  RedeemItemDto,
  GetMarketplaceItemsDto,
} from '../dto/marketplace.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

@ApiTags('Marketplace')
@ApiBearerAuth('JWT')
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
  ) {}

  /**
   * Get all marketplace items
   * GET /marketplace?type=airtime&isFeatured=true
   */
  @Get()
  async getMarketplaceItems(@Query() filters: GetMarketplaceItemsDto) {
    return await this.marketplaceService.getMarketplaceItems(filters);
  }

  /**
   * Get marketplace item details
   * GET /marketplace/:id
   */
  @Get(':id')
  async getItemDetails(@Param('id') id: string) {
    return await this.marketplaceService.getItemDetails(id);
  }

  /**
   * Redeem marketplace item
   * POST /marketplace/redeem
   */
  @Post('redeem')
  async redeemItem(@CurrentUser() user: UserPayload, @Body() dto: RedeemItemDto) {
    return await this.marketplaceService.redeemItem(
      user.userId,
      dto.itemId,
      {
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        bankAccount: dto.bankAccount,
        cryptoAddress: dto.cryptoAddress,
      },
    );
  }

  /**
   * Get user's redemption history
   * GET /marketplace/redemptions?limit=20
   */
  @Get('redemptions/me')
  async getUserRedemptions(
    @CurrentUser() user: UserPayload,
    @Query('limit') limit?: number,
  ) {
    return await this.marketplaceService.getUserRedemptions(
      user.userId,
      limit || 20,
    );
  }

  /**
   * Get redemption details
   * GET /marketplace/redemptions/:id
   */
  @Get('redemptions/:id')
  async getRedemptionDetails(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return await this.marketplaceService.getRedemptionDetails(
      user.userId,
      id,
    );
  }

  /**
   * Create marketplace item (admin only)
   * POST /marketplace/items
   */
  @Post('items')
  async createItem(@Body() dto: CreateMarketplaceItemDto) {
    return await this.marketplaceService.createItem(dto);
  }
}
