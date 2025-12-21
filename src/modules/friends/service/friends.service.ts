import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FriendRequest, FriendRequestStatus } from '../entity/friend-request.entity';
import { Friendship, FriendshipStatus } from '../entity/friendship.entity';
import { User } from '../../user/entity/user.entity';
import {
  SendFriendRequestDto,
  RespondToFriendRequestDto,
  GetFriendsDto,
  RemoveFriendDto,
  BlockFriendDto,
  UnblockFriendDto,
} from '../dto';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string, dto: SendFriendRequestDto) {
    if (userId === dto.receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if receiver exists
    const receiver = await this.userRepository.findOne({
      where: { id: dto.receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { userId, friendId: dto.receiverId },
        { userId: dto.receiverId, friendId: userId },
      ],
    });

    if (existingFriendship) {
      throw new BadRequestException('Already friends with this user');
    }

    // Check if request already exists
    const existingRequest = await this.friendRequestRepository.findOne({
      where: [
        { senderId: userId, receiverId: dto.receiverId, status: FriendRequestStatus.PENDING },
        { senderId: dto.receiverId, receiverId: userId, status: FriendRequestStatus.PENDING },
      ],
    });

    if (existingRequest) {
      throw new BadRequestException('Friend request already exists');
    }

    const request = this.friendRequestRepository.create({
      senderId: userId,
      receiverId: dto.receiverId,
      message: dto.message,
      status: FriendRequestStatus.PENDING,
    });

    await this.friendRequestRepository.save(request);

    this.logger.log(`User ${userId} sent friend request to ${dto.receiverId}`);

    return { success: true, message: 'Friend request sent' };
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId: string) {
    const requests = await this.friendRequestRepository.find({
      where: {
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    return requests;
  }

  /**
   * Respond to friend request
   */
  async respondToFriendRequest(userId: string, dto: RespondToFriendRequestDto) {
    const request = await this.friendRequestRepository.findOne({
      where: {
        id: dto.requestId,
        receiverId: userId,
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('Friend request already responded to');
    }

    if (dto.action === 'accept') {
      request.status = FriendRequestStatus.ACCEPTED;
      request.respondedAt = new Date();
      await this.friendRequestRepository.save(request);

      // Create bidirectional friendship
      const friendship1 = this.friendshipRepository.create({
        userId: request.senderId,
        friendId: request.receiverId,
        status: FriendshipStatus.ACTIVE,
      });

      const friendship2 = this.friendshipRepository.create({
        userId: request.receiverId,
        friendId: request.senderId,
        status: FriendshipStatus.ACTIVE,
      });

      await this.friendshipRepository.save([friendship1, friendship2]);

      this.logger.log(`User ${userId} accepted friend request from ${request.senderId}`);

      return { success: true, message: 'Friend request accepted' };
    } else {
      request.status = FriendRequestStatus.REJECTED;
      request.respondedAt = new Date();
      await this.friendRequestRepository.save(request);

      this.logger.log(`User ${userId} rejected friend request from ${request.senderId}`);

      return { success: true, message: 'Friend request rejected' };
    }
  }

  /**
   * Get user's friends
   */
  async getFriends(userId: string, dto: GetFriendsDto) {
    const { status = 'active', search, page = 1, limit = 50 } = dto;

    const queryBuilder = this.friendshipRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.friend', 'friend')
      .where('friendship.userId = :userId', { userId });

    if (status !== 'all') {
      queryBuilder.andWhere('friendship.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('friend.displayName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [friendships, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: friendships.map(f => f.friend),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string, dto: RemoveFriendDto) {
    // Delete bidirectional friendship
    await this.friendshipRepository.delete([
      { userId, friendId: dto.friendId },
      { userId: dto.friendId, friendId: userId },
    ]);

    this.logger.log(`User ${userId} removed friend ${dto.friendId}`);

    return { success: true, message: 'Friend removed' };
  }

  /**
   * Block friend
   */
  async blockFriend(userId: string, dto: BlockFriendDto) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: dto.friendId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    friendship.status = FriendshipStatus.BLOCKED;
    friendship.blockedAt = new Date();
    await this.friendshipRepository.save(friendship);

    this.logger.log(`User ${userId} blocked friend ${dto.friendId}`);

    return { success: true, message: 'Friend blocked' };
  }

  /**
   * Unblock friend
   */
  async unblockFriend(userId: string, dto: UnblockFriendDto) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: dto.friendId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    friendship.status = FriendshipStatus.ACTIVE;
    friendship.blockedAt = undefined;
    await this.friendshipRepository.save(friendship);

    this.logger.log(`User ${userId} unblocked friend ${dto.friendId}`);

    return { success: true, message: 'Friend unblocked' };
  }

  /**
   * Get friend statistics
   */
  async getFriendStats(userId: string) {
    const [total, active, blocked] = await Promise.all([
      this.friendshipRepository.count({ where: { userId } }),
      this.friendshipRepository.count({
        where: { userId, status: FriendshipStatus.ACTIVE },
      }),
      this.friendshipRepository.count({
        where: { userId, status: FriendshipStatus.BLOCKED },
      }),
    ]);

    const pendingRequests = await this.friendRequestRepository.count({
      where: { receiverId: userId, status: FriendRequestStatus.PENDING },
    });

    return {
      total,
      active,
      blocked,
      pendingRequests,
    };
  }

  /**
   * Search users to add as friends
   */
  async searchUsers(userId: string, query: string, limit: number = 20) {
    // Get user's friend IDs to exclude
    const friendships = await this.friendshipRepository.find({
      where: { userId },
      select: ['friendId'],
    });

    const friendIds = friendships.map(f => f.friendId);

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere(friendIds.length > 0 ? 'user.id NOT IN (:...friendIds)' : '1=1', { friendIds })
      .andWhere('(user.displayName ILIKE :query OR user.phone ILIKE :query)', {
        query: `%${query}%`,
      })
      .select(['user.id', 'user.displayName', 'user.phone', 'user.rank', 'user.xp'])
      .take(limit)
      .getMany();

    return users;
  }
}
