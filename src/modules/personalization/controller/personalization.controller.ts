import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalizationService } from '../service/personalization.service';
import {
  PurchaseAvatarDto,
  PurchaseProfileItemDto,
  EquipAvatarDto,
  EquipProfileItemDto,
  GetAvatarsQueryDto,
  GetProfileItemsQueryDto,
  CreateAvatarDto,
  CreateProfileItemDto,
} from '../dto/personalization.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
import { ProfileItemType } from '../entity/profile-item.entity';

@ApiTags('Personalization')
@ApiBearerAuth('JWT')
@Controller('personalization')
export class PersonalizationController {
  constructor(private readonly personalizationService: PersonalizationService) {}

  // ============= AVATARS =============
  @Get('avatars')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all available avatars' })
  async getAvatars(@Query() query: GetAvatarsQueryDto) {
    return await this.personalizationService.getAvatars(query);
  }

  @Get('avatars/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user owned avatars' })
  async getMyAvatars(@Request() req: RequestWithUser) {
    return await this.personalizationService.getUserAvatars(parseInt(req.user.userId));
  }

  @Post('avatars/purchase')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Purchase an avatar' })
  async purchaseAvatar(@Request() req: RequestWithUser, @Body() dto: PurchaseAvatarDto) {
    return await this.personalizationService.purchaseAvatar(parseInt(req.user.userId), dto);
  }

  @Post('avatars/equip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Equip an avatar' })
  async equipAvatar(@Request() req: RequestWithUser, @Body() dto: EquipAvatarDto) {
    await this.personalizationService.equipAvatar(parseInt(req.user.userId), dto);
    return { status: 'success' };
  }

  // ============= PROFILE ITEMS =============
  @Get('items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all available profile items' })
  async getProfileItems(@Query() query: GetProfileItemsQueryDto) {
    return await this.personalizationService.getProfileItems(query);
  }

  @Get('items/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user owned profile items' })
  async getMyProfileItems(
    @Request() req: RequestWithUser,
    @Query('type') type?: ProfileItemType,
  ) {
    return await this.personalizationService.getUserProfileItems(parseInt(req.user.userId), type);
  }

  @Post('items/purchase')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Purchase a profile item' })
  async purchaseProfileItem(
    @Request() req: RequestWithUser,
    @Body() dto: PurchaseProfileItemDto,
  ) {
    return await this.personalizationService.purchaseProfileItem(parseInt(req.user.userId), dto);
  }

  @Post('items/equip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Equip a profile item' })
  async equipProfileItem(@Request() req: RequestWithUser, @Body() dto: EquipProfileItemDto) {
    await this.personalizationService.equipProfileItem(parseInt(req.user.userId), dto);
    return { status: 'success' };
  }

  // ============= CUSTOMIZATION =============
  @Get('my-customization')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user equipped customizations' })
  async getMyCustomization(@Request() req: RequestWithUser) {
    return await this.personalizationService.getUserCustomization(parseInt(req.user.userId));
  }

  // ============= ADMIN =============
  @Post('admin/avatars')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create avatar (admin)' })
  async createAvatar(@Body() dto: CreateAvatarDto) {
    return await this.personalizationService.createAvatar(dto);
  }

  @Post('admin/items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create profile item (admin)' })
  async createProfileItem(@Body() dto: CreateProfileItemDto) {
    return await this.personalizationService.createProfileItem(dto);
  }
}
