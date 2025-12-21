import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VIPSubscription, SubscriptionStatus } from '../entity/vip-subscription.entity';
import { User, VIPTier } from '../../user/entity/user.entity';
import { SubscribeVIPDto, GetSubscriptionHistoryDto, CancelSubscriptionDto } from '../dto';

@Injectable()
export class VIPService {
  private readonly logger = new Logger(VIPService.name);

  // VIP tier pricing (in NGN)
  private readonly VIP_PRICING = {
    [VIPTier.FREE]: 0,
    [VIPTier.BRONZE]: 500,
    [VIPTier.SILVER]: 1000,
    [VIPTier.GOLD]: 2500,
  };

  // VIP tier benefits multipliers
  private readonly VIP_BENEFITS = {
    [VIPTier.FREE]: {
      coinMultiplier: 1.0,
      xpMultiplier: 1.0,
      dailyCoinLimit: 5000,
      dailySessionLimit: 50,
      noAds: false,
      exclusiveTournaments: false,
      monthlyMysteryBoxes: 0,
      prioritySupport: false,
    },
    [VIPTier.BRONZE]: {
      coinMultiplier: 1.2,
      xpMultiplier: 1.1,
      dailyCoinLimit: 7500,
      dailySessionLimit: 75,
      noAds: true,
      exclusiveTournaments: false,
      monthlyMysteryBoxes: 1,
      prioritySupport: false,
    },
    [VIPTier.SILVER]: {
      coinMultiplier: 1.4,
      xpMultiplier: 1.25,
      dailyCoinLimit: 10000,
      dailySessionLimit: 100,
      noAds: true,
      exclusiveTournaments: true,
      monthlyMysteryBoxes: 2,
      prioritySupport: true,
    },
    [VIPTier.GOLD]: {
      coinMultiplier: 1.5,
      xpMultiplier: 1.5,
      dailyCoinLimit: 15000,
      dailySessionLimit: 150,
      noAds: true,
      exclusiveTournaments: true,
      monthlyMysteryBoxes: 5,
      prioritySupport: true,
    },
  };

  constructor(
    @InjectRepository(VIPSubscription)
    private readonly subscriptionRepository: Repository<VIPSubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Subscribe user to VIP tier
   */
  async subscribeVIP(userId: string, dto: SubscribeVIPDto): Promise<VIPSubscription> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if payment reference exists
    const existingPayment = await this.subscriptionRepository.findOne({
      where: { paymentReference: dto.paymentReference },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment reference already used');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 30 days

    const subscription = this.subscriptionRepository.create({
      userId,
      tier: dto.tier,
      amount: this.VIP_PRICING[dto.tier],
      paymentReference: dto.paymentReference,
      paymentMethod: 'PAYSTACK' as any,
      status: SubscriptionStatus.ACTIVE,
      startsAt: now,
      expiresAt,
      autoRenew: dto.autoRenew || false,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    // Update user VIP status
    user.vipTier = dto.tier;
    user.vipExpiresAt = expiresAt;
    await this.userRepository.save(user);

    this.logger.log(`User ${userId} subscribed to ${dto.tier} VIP`);

    return saved;
  }

  /**
   * Get VIP benefits for tier
   */
  getVIPBenefits(tier: VIPTier) {
    return {
      tier,
      pricing: this.VIP_PRICING[tier],
      benefits: this.VIP_BENEFITS[tier],
    };
  }

  /**
   * Get all VIP tiers with benefits
   */
  getAllVIPTiers() {
    return Object.values(VIPTier).map(tier => this.getVIPBenefits(tier));
  }

  /**
   * Get user's subscription history
   */
  async getSubscriptionHistory(userId: string, dto: GetSubscriptionHistoryDto) {
    const { page = 1, limit = 10 } = dto;

    const [subscriptions, total] = await this.subscriptionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active subscription for user
   */
  async getActiveSubscription(userId: string): Promise<VIPSubscription | null> {
    return await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      order: { expiresAt: 'DESC' },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        id: dto.subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription is not active');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`User ${userId} cancelled subscription ${subscription.id}`);

    return { success: true, message: 'Subscription cancelled' };
  }

  /**
   * Check and apply VIP multipliers
   */
  applyVIPMultiplier(userId: string, baseAmount: number, type: 'coins' | 'xp'): number {
    // This will be called from other services
    // For now, return base amount - needs user VIP tier lookup
    return baseAmount;
  }

  /**
   * Get VIP daily limits for user
   */
  async getVIPLimits(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const benefits = this.VIP_BENEFITS[user.vipTier];

    return {
      dailyCoinLimit: benefits.dailyCoinLimit,
      dailySessionLimit: benefits.dailySessionLimit,
      coinMultiplier: benefits.coinMultiplier,
      xpMultiplier: benefits.xpMultiplier,
    };
  }

  /**
   * Expire VIP subscriptions (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireSubscriptions() {
    const now = new Date();

    // Find expired subscriptions
    const expiredSubs = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThan(now),
      },
      relations: ['user'],
    });

    for (const sub of expiredSubs) {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(sub);

      // Downgrade user to FREE tier
      const user = await this.userRepository.findOne({ where: { id: sub.userId } });
      if (user) {
        user.vipTier = VIPTier.FREE;
        user.vipExpiresAt = undefined;
        await this.userRepository.save(user);
      }

      this.logger.log(`Expired VIP subscription for user ${sub.userId}`);
    }

    this.logger.log(`Expired ${expiredSubs.length} VIP subscriptions`);
  }

  /**
   * Get VIP statistics
   */
  async getVIPStats() {
    const [total, bronze, silver, gold] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { vipTier: VIPTier.BRONZE } }),
      this.userRepository.count({ where: { vipTier: VIPTier.SILVER } }),
      this.userRepository.count({ where: { vipTier: VIPTier.GOLD } }),
    ]);

    const free = total - (bronze + silver + gold);

    return {
      total,
      breakdown: {
        free,
        bronze,
        silver,
        gold,
      },
      conversionRate: total > 0 ? ((total - free) / total) * 100 : 0,
    };
  }
}
