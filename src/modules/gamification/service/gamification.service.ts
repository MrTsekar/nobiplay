import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserStreak } from '../entity/user-streak.entity';
import {
  SpinWheelReward,
  RewardType,
} from '../entity/spin-wheel-reward.entity';
import { SpinHistory } from '../entity/spin-history.entity';
import {
  MysteryBox,
  MysteryBoxTrigger,
  MysteryBoxStatus,
} from '../entity/mystery-box.entity';
import { User } from '../../user/entity/user.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectRepository(UserStreak)
    private readonly streakRepository: Repository<UserStreak>,
    @InjectRepository(SpinWheelReward)
    private readonly rewardRepository: Repository<SpinWheelReward>,
    @InjectRepository(SpinHistory)
    private readonly spinHistoryRepository: Repository<SpinHistory>,
    @InjectRepository(MysteryBox)
    private readonly mysteryBoxRepository: Repository<MysteryBox>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Update user streak after gameplay
   */
  async updateStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.streakRepository.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastPlayDate: new Date(),
        streakStartDate: new Date(),
        totalDaysPlayed: 1,
      });

      return await this.streakRepository.save(streak);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastPlay = new Date(streak.lastPlayDate || new Date());
    lastPlay.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - lastPlay.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff === 0) {
      // Already played today
      return streak;
    } else if (daysDiff === 1) {
      // Consecutive day
      streak.currentStreak += 1;
      streak.totalDaysPlayed += 1;

      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }

      // Award streak milestones
      if ([3, 7, 14, 30, 60, 100].includes(streak.currentStreak)) {
        await this.awardStreakBonus(userId, streak.currentStreak);
      }
    } else {
      // Streak broken
      streak.currentStreak = 1;
      streak.streakStartDate = today;
      streak.totalDaysPlayed += 1;
    }

    streak.lastPlayDate = new Date();
    await this.streakRepository.save(streak);

    this.logger.log(`User ${userId} streak updated: ${streak.currentStreak} days`);

    return streak;
  }

  /**
   * Get user streak
   */
  async getUserStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.streakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysPlayed: 0,
      });
    }

    return streak;
  }

  /**
   * Spin the wheel
   */
  async spinWheel(userId: string): Promise<{ spin: SpinHistory; reward: SpinWheelReward }> {
    // Check if user can spin (once per 24 hours)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentSpin = await this.spinHistoryRepository.findOne({
      where: {
        userId,
        createdAt: MoreThan(last24Hours),
      },
    });

    if (recentSpin) {
      throw new BadRequestException(
        'You can only spin once every 24 hours',
      );
    }

    // Get all active rewards
    const rewards = await this.rewardRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });

    if (rewards.length === 0) {
      throw new BadRequestException('No rewards available');
    }

    // Weighted random selection
    const selectedReward = this.selectWeightedReward(rewards);

    // Create spin history
    const spin = this.spinHistoryRepository.create({
      userId,
      rewardId: selectedReward.id,
      rewardValue: selectedReward.value,
    });

    await this.spinHistoryRepository.save(spin);

    // Process reward
    await this.processReward(userId, selectedReward);

    // Mark as claimed
    spin.isClaimed = true;
    spin.claimedAt = new Date();
    await this.spinHistoryRepository.save(spin);

    this.logger.log(
      `User ${userId} spun wheel and won: ${selectedReward.type} (${selectedReward.value})`,
    );

    return { spin, reward: selectedReward };
  }

  /**
   * Get user's spin history
   */
  async getUserSpinHistory(userId: string, limit = 20): Promise<SpinHistory[]> {
    return await this.spinHistoryRepository.find({
      where: { userId },
      relations: ['reward'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Award mystery box
   */
  async awardMysteryBox(
    userId: string,
    trigger: MysteryBoxTrigger,
  ): Promise<MysteryBox> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const mysteryBox = this.mysteryBoxRepository.create({
      userId,
      trigger,
      expiresAt,
    });

    await this.mysteryBoxRepository.save(mysteryBox);

    this.logger.log(`Mystery box awarded to user ${userId} (${trigger})`);

    return mysteryBox;
  }

  /**
   * Open mystery box
   */
  async openMysteryBox(
    userId: string,
    boxId: string,
  ): Promise<{ box: MysteryBox; rewards: any }> {
    const box = await this.mysteryBoxRepository.findOne({
      where: { id: boxId, userId },
    });

    if (!box) {
      throw new NotFoundException('Mystery box not found');
    }

    if (box.status === MysteryBoxStatus.OPENED) {
      throw new BadRequestException('Mystery box already opened');
    }

    if (box.status === MysteryBoxStatus.EXPIRED) {
      throw new BadRequestException('Mystery box has expired');
    }

    // Generate random rewards
    const rewards = await this.generateMysteryBoxRewards(box.trigger);

    box.rewards = rewards;
    box.status = MysteryBoxStatus.OPENED;
    box.openedAt = new Date();
    await this.mysteryBoxRepository.save(box);

    // Process rewards
    await this.processMysteryBoxRewards(userId, rewards);

    this.logger.log(`User ${userId} opened mystery box ${boxId}`);

    return { box, rewards };
  }

  /**
   * Get user's mystery boxes
   */
  async getUserMysteryBoxes(userId: string): Promise<MysteryBox[]> {
    return await this.mysteryBoxRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create spin wheel rewards (admin only)
   */
  async createSpinReward(dto: {
    name: string;
    type: RewardType;
    value: number;
    probabilityWeight: number;
    icon?: string;
    displayOrder?: number;
  }): Promise<SpinWheelReward> {
    const reward = this.rewardRepository.create(dto);
    return await this.rewardRepository.save(reward);
  }

  /**
   * Get all spin wheel rewards
   */
  async getSpinRewards(): Promise<SpinWheelReward[]> {
    return await this.rewardRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Auto-expire mystery boxes
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireMysteryBoxes() {
    const now = new Date();

    await this.mysteryBoxRepository.update(
      {
        status: MysteryBoxStatus.EARNED,
        expiresAt: MoreThan(now),
      },
      {
        status: MysteryBoxStatus.EXPIRED,
      },
    );

    this.logger.log('Expired mystery boxes updated');
  }

  /**
   * Private: Award streak bonus
   */
  private async awardStreakBonus(
    userId: string,
    streakDays: number,
  ): Promise<void> {
    const bonusCoins = streakDays * 10; // 10 coins per streak day

    await this.walletService.creditCoins({
      userId,
      amount: bonusCoins,
      type: TransactionType.COIN_EARN,
      description: `${streakDays}-day streak bonus`,
      metadata: { streakDays },
    });

    // Award mystery box for major milestones
    if ([7, 30, 100].includes(streakDays)) {
      await this.awardMysteryBox(userId, MysteryBoxTrigger.STREAK_MILESTONE);
    }
  }

  /**
   * Private: Weighted random reward selection
   */
  private selectWeightedReward(
    rewards: SpinWheelReward[],
  ): SpinWheelReward {
    const totalWeight = rewards.reduce(
      (sum, r) => sum + Number(r.probabilityWeight),
      0,
    );

    let random = Math.random() * totalWeight;

    for (const reward of rewards) {
      random -= Number(reward.probabilityWeight);
      if (random <= 0) {
        return reward;
      }
    }

    return rewards[rewards.length - 1];
  }

  /**
   * Private: Process spin reward
   */
  private async processReward(
    userId: string,
    reward: SpinWheelReward,
  ): Promise<void> {
    switch (reward.type) {
      case RewardType.COINS:
        await this.walletService.creditCoins({
          userId,
          amount: reward.value,
          type: TransactionType.COIN_EARN,
          description: 'Spin wheel reward',
          metadata: { rewardId: reward.id },
        });
        break;

      case RewardType.MYSTERY_BOX:
        await this.awardMysteryBox(
          userId,
          MysteryBoxTrigger.DAILY_QUEST,
        );
        break;

      case RewardType.XP_BOOST:
        // XP boost would be tracked in user stats
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        if (user) {
          user.xp += reward.value;
          await this.userRepository.save(user);
        }
        break;

      // Handle other reward types as needed
    }
  }

  /**
   * Private: Generate mystery box rewards
   */
  private async generateMysteryBoxRewards(
    trigger: MysteryBoxTrigger,
  ): Promise<any> {
    const baseCoins = Math.floor(Math.random() * 500) + 100;

    const rewards: { coins: number; xp: number; bonusCoins?: number; streakBonus?: number } = {
      coins: baseCoins,
      xp: Math.floor(baseCoins / 2),
    };

    // Add bonus for special triggers
    if (trigger === MysteryBoxTrigger.TOURNAMENT_WIN) {
      rewards.bonusCoins = 500;
    } else if (trigger === MysteryBoxTrigger.STREAK_MILESTONE) {
      rewards.streakBonus = 300;
    }

    return rewards;
  }

  /**
   * Private: Process mystery box rewards
   */
  private async processMysteryBoxRewards(
    userId: string,
    rewards: any,
  ): Promise<void> {
    let totalCoins = 0;

    if (rewards.coins) totalCoins += rewards.coins;
    if (rewards.bonusCoins) totalCoins += rewards.bonusCoins;
    if (rewards.streakBonus) totalCoins += rewards.streakBonus;

    if (totalCoins > 0) {
      await this.walletService.creditCoins({
        userId,
        amount: totalCoins,
        type: TransactionType.COIN_EARN,
        description: 'Mystery box reward',
        metadata: { rewards },
      });
    }

    if (rewards.xp) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (user) {
        user.xp += rewards.xp;
        await this.userRepository.save(user);
      }
    }
  }
}
