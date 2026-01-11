import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FriendsService } from '../service/friends.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';
import {
  SendFriendRequestDto,
  RespondToFriendRequestDto,
  GetFriendsDto,
  RemoveFriendDto,
  BlockFriendDto,
  UnblockFriendDto,
} from '../dto';

@ApiTags('Friends')
@ApiBearerAuth('JWT')
@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * Send friend request
   * POST /friends/request
   */
  @Post('request')
  @ApiOperation({ summary: 'Send friend request' })
  async sendFriendRequest(
    @CurrentUser() user: UserPayload,
    @Body() dto: SendFriendRequestDto,
  ) {
    return await this.friendsService.sendFriendRequest(user.userId, dto);
  }

  /**
   * Get pending friend requests
   * GET /friends/requests/pending
   */
  @Get('requests/pending')
  @ApiOperation({ summary: 'Get pending friend requests' })
  async getPendingRequests(@CurrentUser() user: UserPayload) {
    return await this.friendsService.getPendingRequests(user.userId);
  }

  /**
   * Respond to friend request
   * POST /friends/request/respond
   */
  @Post('request/respond')
  @ApiOperation({ summary: 'Respond to friend request' })
  async respondToFriendRequest(
    @CurrentUser() user: UserPayload,
    @Body() dto: RespondToFriendRequestDto,
  ) {
    return await this.friendsService.respondToFriendRequest(user.userId, dto);
  }

  /**
   * Get friends list
   * GET /friends
   */
  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  async getFriends(
    @CurrentUser() user: UserPayload,
    @Query() dto: GetFriendsDto,
  ) {
    return await this.friendsService.getFriends(user.userId, dto);
  }

  /**
   * Get friend statistics
   * GET /friends/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get friend statistics' })
  async getFriendStats(@CurrentUser() user: UserPayload) {
    return await this.friendsService.getFriendStats(user.userId);
  }

  /**
   * Search users to add
   * GET /friends/search
   */
  @Get('search')
  @ApiOperation({ summary: 'Search users to add as friends' })
  async searchUsers(
    @CurrentUser() user: UserPayload,
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return await this.friendsService.searchUsers(user.userId, query, limit);
  }

  /**
   * Remove friend
   * POST /friends/remove
   */
  @Post('remove')
  @ApiOperation({ summary: 'Remove friend' })
  async removeFriend(
    @CurrentUser() user: UserPayload,
    @Body() dto: RemoveFriendDto,
  ) {
    return await this.friendsService.removeFriend(user.userId, dto);
  }

  /**
   * Block friend
   * POST /friends/block
   */
  @Post('block')
  @ApiOperation({ summary: 'Block friend' })
  async blockFriend(
    @CurrentUser() user: UserPayload,
    @Body() dto: BlockFriendDto,
  ) {
    return await this.friendsService.blockFriend(user.userId, dto);
  }

  /**
   * Unblock friend
   * POST /friends/unblock
   */
  @Post('unblock')
  @ApiOperation({ summary: 'Unblock friend' })
  async unblockFriend(
    @CurrentUser() user: UserPayload,
    @Body() dto: UnblockFriendDto,
  ) {
    return await this.friendsService.unblockFriend(user.userId, dto);
  }
}
