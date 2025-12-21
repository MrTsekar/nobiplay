import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Quest, QuestType, QuestFrequency, QuestDifficulty } from '../entity/quest.entity';
import { UserQuest, UserQuestStatus } from '../entity/user-quest.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { UsersService } from '../../user/service/users.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { CreateQuestDto, GetUserQuestsDto, ClaimQuestRewardDto, QuestProgressDto } from '../dto';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: Repository<UserQuest>,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new quest template (admin only)
   */
  async createQuest(dto: CreateQuestDto): Promise<Quest> {
    const quest = this.questRepository.create(dto);
    return await this.questRepository.save(quest);
  }

  /**
   * Get all quest templates
   */
  async getAllQuests(): Promise<Quest[]> {
    return await this.questRepository.find({
      where: { isActive: true },
      order: { orderPriority: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get user's active quests
   */
  async getUserQuests(userId: string, dto: GetUserQuestsDto) {
    const { status = 'active', page = 1, limit = 20 } = dto;

    const queryBuilder = this.userQuestRepository
      .createQueryBuilder('uq')
      .leftJoinAndSelect('uq.quest', 'quest')
      .where('uq.userId = :userId', { userId });

    if (status !== 'all') {
      queryBuilder.andWhere('uq.status = :status', { status });
    }

    const [userQuests, total] = await queryBuilder
      .orderBy('uq.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: userQuests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Auto-assign daily quests to user
   */
  async assignDailyQuests(userId: string): Promise<UserQuest[]> {
    // Check if user already has active daily quests for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingQuests = await this.userQuestRepository.find({
      where: {
        userId,
        status: UserQuestStatus.ACTIVE,
      },
      relations: ['quest'],
    });

    const hasTodayQuests = existingQuests.some(uq => {
      const questDate = new Date(uq.startedAt);
      questDate.setHours(0, 0, 0, 0);
      return questDate.getTime() === today.getTime() && uq.quest.frequency === QuestFrequency.DAILY;
    });

    if (hasTodayQuests) {
      return existingQuests.filter(uq => uq.quest.frequency === QuestFrequency.DAILY);
    }

    // Get daily quest templates
    const dailyQuests = await this.questRepository.find({
      where: {
        frequency: QuestFrequency.DAILY,
        isActive: true,
      },
      order: { orderPriority: 'ASC' },
      take: 5, // Assign 5 daily quests
    });

    // Create user quests
    const userQuests: UserQuest[] = [];
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    for (const quest of dailyQuests) {
      const userQuest = this.userQuestRepository.create({
        userId,
        questId: quest.id,
        targetValue: quest.targetValue,
        status: UserQuestStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt,
      });

      userQuests.push(await this.userQuestRepository.save(userQuest));
    }

    this.logger.log(`Assigned ${userQuests.length} daily quests to user ${userId}`);
    return userQuests;
  }

  /**
   * Update quest progress
   */
  async updateQuestProgress(userId: string, dto: QuestProgressDto): Promise<void> {
    // Get active user quests matching the type
    const userQuests = await this.userQuestRepository.find({
      where: {
        userId,
        status: UserQuestStatus.ACTIVE,
      },
      relations: ['quest'],
    });

    const matchingQuests = userQuests.filter(uq => {
      if (uq.quest.type !== dto.questType) return false;

      // Check metadata matching if required
      if (dto.metadata && uq.quest.metadata) {
        const questMeta = uq.quest.metadata;
        if (questMeta.category && dto.metadata.category) {
          return questMeta.category === dto.metadata.category;
        }
        if (questMeta.mode && dto.metadata.mode) {
          return questMeta.mode === dto.metadata.mode;
        }
      }

      return true;
    });

    for (const userQuest of matchingQuests) {
      userQuest.currentProgress += dto.progress;

      // Check if quest is completed
      if (userQuest.currentProgress >= userQuest.targetValue) {
        userQuest.status = UserQuestStatus.COMPLETED;
        userQuest.completedAt = new Date();
        this.logger.log(`User ${userId} completed quest ${userQuest.questId}`);
      }

      await this.userQuestRepository.save(userQuest);
    }
  }

  /**
   * Claim quest reward
   */
  async claimQuestReward(userId: string, dto: ClaimQuestRewardDto) {
    const userQuest = await this.userQuestRepository.findOne({
      where: {
        id: dto.userQuestId,
        userId,
      },
      relations: ['quest'],
    });

    if (!userQuest) {
      throw new NotFoundException('Quest not found');
    }

    if (userQuest.status !== UserQuestStatus.COMPLETED) {
      throw new BadRequestException('Quest not completed yet');
    }

    if (userQuest.claimedAt) {
      throw new BadRequestException('Reward already claimed');
    }

    // Award coins
    if (userQuest.quest.coinReward > 0) {
      await this.walletService.creditCoins({
        userId,
        amount: userQuest.quest.coinReward,
        type: TransactionType.COIN_EARN,
        description: `Quest reward: ${userQuest.quest.title}`,
        metadata: { questId: userQuest.questId },
      });
    }

    // Award XP
    if (userQuest.quest.xpReward > 0) {
      await this.usersService.updateGameStats(userId, {
        xpEarned: userQuest.quest.xpReward,
      });
    }

    // Handle bonus rewards (mystery box, powerup, etc.)
    const bonusRewards: any = {};
    if (userQuest.quest.bonusReward) {
      try {
        const bonus = JSON.parse(userQuest.quest.bonusReward);
        bonusRewards.bonus = bonus;
        // TODO: Integrate with gamification service for mystery boxes
      } catch (e) {
        this.logger.warn(`Failed to parse bonus reward: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Update quest status
    userQuest.status = UserQuestStatus.CLAIMED;
    userQuest.claimedAt = new Date();
    await this.userQuestRepository.save(userQuest);

    return {
      success: true,
      rewards: {
        coins: userQuest.quest.coinReward,
        xp: userQuest.quest.xpReward,
        ...bonusRewards,
      },
    };
  }

  /**
   * Expire old quests daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireQuests() {
    const now = new Date();

    const result = await this.userQuestRepository.update(
      {
        status: UserQuestStatus.ACTIVE,
        expiresAt: LessThan(now),
      },
      {
        status: UserQuestStatus.EXPIRED,
      },
    );

    this.logger.log(`Expired ${result.affected} quests`);
  }

  /**
   * Get quest statistics for user
   */
  async getQuestStats(userId: string) {
    const [completed, active, total] = await Promise.all([
      this.userQuestRepository.count({
        where: { userId, status: UserQuestStatus.CLAIMED },
      }),
      this.userQuestRepository.count({
        where: { userId, status: UserQuestStatus.ACTIVE },
      }),
      this.userQuestRepository.count({
        where: { userId },
      }),
    ]);

    return {
      completed,
      active,
      total,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }
}
