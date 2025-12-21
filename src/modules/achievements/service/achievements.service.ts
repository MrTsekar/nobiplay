import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement, AchievementType } from '../entity/achievement.entity';
import { UserAchievement } from '../entity/user-achievement.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { UsersService } from '../../user/service/users.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import {
  CreateAchievementDto,
  GetUserAchievementsDto,
  ClaimAchievementRewardDto,
  AchievementProgressDto,
} from '../dto';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new achievement (admin only)
   */
  async createAchievement(dto: CreateAchievementDto): Promise<Achievement> {
    const achievement = this.achievementRepository.create(dto);
    return await this.achievementRepository.save(achievement);
  }

  /**
   * Get all achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    return await this.achievementRepository.find({
      where: { isActive: true, isSecret: false },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get user's achievements with progress
   */
  async getUserAchievements(userId: string, dto: GetUserAchievementsDto) {
    const { filter = 'all', sortBy = 'progress', page = 1, limit = 50 } = dto;

    const queryBuilder = this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoinAndSelect('ua.achievement', 'achievement')
      .where('ua.userId = :userId', { userId });

    if (filter === 'unlocked') {
      queryBuilder.andWhere('ua.isUnlocked = true');
    } else if (filter === 'locked') {
      queryBuilder.andWhere('ua.isUnlocked = false');
    }

    // Sorting
    if (sortBy === 'progress') {
      queryBuilder
        .addSelect('(ua.currentProgress::float / ua.requiredValue::float)', 'progress_ratio')
        .orderBy('progress_ratio', 'DESC');
    } else if (sortBy === 'tier') {
      queryBuilder.orderBy('achievement.tier', 'ASC');
    } else if (sortBy === 'recent') {
      queryBuilder.orderBy('ua.unlockedAt', 'DESC');
    }

    const [userAchievements, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: userAchievements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Initialize achievements for new user
   */
  async initializeUserAchievements(userId: string): Promise<void> {
    const achievements = await this.achievementRepository.find({
      where: { isActive: true },
    });

    const userAchievements = achievements.map(achievement =>
      this.userAchievementRepository.create({
        userId,
        achievementId: achievement.id,
        requiredValue: achievement.requiredValue,
        currentProgress: 0,
        isUnlocked: false,
      }),
    );

    await this.userAchievementRepository.save(userAchievements);
    this.logger.log(`Initialized ${achievements.length} achievements for user ${userId}`);
  }

  /**
   * Update achievement progress
   */
  async updateAchievementProgress(userId: string, dto: AchievementProgressDto): Promise<void> {
    const userAchievements = await this.userAchievementRepository.find({
      where: {
        userId,
        isUnlocked: false,
      },
      relations: ['achievement'],
    });

    const matchingAchievements = userAchievements.filter(ua => {
      if (ua.achievement.type !== dto.achievementType) return false;

      // Check metadata matching if required
      if (dto.metadata && ua.achievement.metadata) {
        const achievementMeta = ua.achievement.metadata;
        if (achievementMeta.category && dto.metadata.category) {
          return achievementMeta.category === dto.metadata.category;
        }
        if (achievementMeta.mode && dto.metadata.mode) {
          return achievementMeta.mode === dto.metadata.mode;
        }
      }

      return true;
    });

    for (const userAchievement of matchingAchievements) {
      userAchievement.currentProgress += dto.progress;

      // Check if achievement is unlocked
      if (userAchievement.currentProgress >= userAchievement.requiredValue) {
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
        this.logger.log(
          `User ${userId} unlocked achievement: ${userAchievement.achievement.title}`,
        );

        // TODO: Send notification
      }

      await this.userAchievementRepository.save(userAchievement);
    }
  }

  /**
   * Claim achievement reward
   */
  async claimAchievementReward(userId: string, dto: ClaimAchievementRewardDto) {
    const userAchievement = await this.userAchievementRepository.findOne({
      where: {
        id: dto.userAchievementId,
        userId,
      },
      relations: ['achievement'],
    });

    if (!userAchievement) {
      throw new NotFoundException('Achievement not found');
    }

    if (!userAchievement.isUnlocked) {
      throw new BadRequestException('Achievement not unlocked yet');
    }

    if (userAchievement.rewardClaimed) {
      throw new BadRequestException('Reward already claimed');
    }

    // Award coins
    if (userAchievement.achievement.coinReward > 0) {
      await this.walletService.creditCoins({
        userId,
        amount: userAchievement.achievement.coinReward,
        type: TransactionType.COIN_EARN,
        description: `Achievement reward: ${userAchievement.achievement.title}`,
        metadata: { achievementId: userAchievement.achievementId },
      });
    }

    // Award XP
    if (userAchievement.achievement.xpReward > 0) {
      await this.usersService.updateGameStats(userId, {
        xpEarned: userAchievement.achievement.xpReward,
      });
    }

    // Update achievement status
    userAchievement.rewardClaimed = true;
    userAchievement.claimedAt = new Date();
    await this.userAchievementRepository.save(userAchievement);

    return {
      success: true,
      rewards: {
        coins: userAchievement.achievement.coinReward,
        xp: userAchievement.achievement.xpReward,
        badge: userAchievement.achievement.badgeUrl,
      },
    };
  }

  /**
   * Get achievement statistics for user
   */
  async getAchievementStats(userId: string) {
    const [unlocked, total] = await Promise.all([
      this.userAchievementRepository.count({
        where: { userId, isUnlocked: true },
      }),
      this.userAchievementRepository.count({
        where: { userId },
      }),
    ]);

    const recentlyUnlocked = await this.userAchievementRepository.find({
      where: { userId, isUnlocked: true },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' },
      take: 5,
    });

    return {
      unlocked,
      total,
      completionRate: total > 0 ? (unlocked / total) * 100 : 0,
      recentlyUnlocked,
    };
  }

  /**
   * Get achievement leaderboard (most achievements unlocked)
   */
  async getAchievementLeaderboard(limit: number = 100) {
    const result = await this.userAchievementRepository
      .createQueryBuilder('ua')
      .select('ua.userId', 'userId')
      .addSelect('COUNT(*)', 'achievementsUnlocked')
      .where('ua.isUnlocked = true')
      .groupBy('ua.userId')
      .orderBy('achievementsUnlocked', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }
}
