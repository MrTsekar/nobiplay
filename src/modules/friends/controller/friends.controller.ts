import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FriendsService } from '../service/friends.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';
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
    @Request() req: RequestWithUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return await this.friendsService.sendFriendRequest(req.user.userId, dto);
  }

  /**
   * Get pending friend requests
   * GET /friends/requests/pending
   */
  @Get('requests/pending')
  @ApiOperation({ summary: 'Get pending friend requests' })
  async getPendingRequests(@Request() req: RequestWithUser) {
    return await this.friendsService.getPendingRequests(req.user.userId);
  }

  /**
   * Respond to friend request
   * POST /friends/request/respond
   */
  @Post('request/respond')
  @ApiOperation({ summary: 'Respond to friend request' })
  async respondToFriendRequest(
    @Request() req: RequestWithUser,
    @Body() dto: RespondToFriendRequestDto,
  ) {
    return await this.friendsService.respondToFriendRequest(req.user.userId, dto);
  }

  /**
   * Get friends list
   * GET /friends
   */
  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  async getFriends(
    @Request() req: RequestWithUser,
    @Query() dto: GetFriendsDto,
  ) {
    return await this.friendsService.getFriends(req.user.userId, dto);
  }

  /**
   * Get friend statistics
   * GET /friends/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get friend statistics' })
  async getFriendStats(@Request() req: RequestWithUser) {
    return await this.friendsService.getFriendStats(req.user.userId);
  }

  /**
   * Search users to add
   * GET /friends/search
   */
  @Get('search')
  @ApiOperation({ summary: 'Search users to add as friends' })
  async searchUsers(
    @Request() req: RequestWithUser,
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return await this.friendsService.searchUsers(req.user.userId, query, limit);
  }

  /**
   * Remove friend
   * POST /friends/remove
   */
  @Post('remove')
  @ApiOperation({ summary: 'Remove friend' })
  async removeFriend(
    @Request() req: RequestWithUser,
    @Body() dto: RemoveFriendDto,
  ) {
    return await this.friendsService.removeFriend(req.user.userId, dto);
  }

  /**
   * Block friend
   * POST /friends/block
   */
  @Post('block')
  @ApiOperation({ summary: 'Block friend' })
  async blockFriend(
    @Request() req: RequestWithUser,
    @Body() dto: BlockFriendDto,
  ) {
    return await this.friendsService.blockFriend(req.user.userId, dto);
  }

  /**
   * Unblock friend
   * POST /friends/unblock
   */
  @Post('unblock')
  @ApiOperation({ summary: 'Unblock friend' })
  async unblockFriend(
    @Request() req: RequestWithUser,
    @Body() dto: UnblockFriendDto,
  ) {
    return await this.friendsService.unblockFriend(req.user.userId, dto);
  }
}
