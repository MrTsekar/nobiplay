import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral, ReferralStatus } from '../entity/referral.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { GetReferralStatsDto } from '../dto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly REFERRAL_BONUS = 50; // Bonus coins for successful referral

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create referral record when a new user registers with referral code
   */
  async createReferral(referrerId: string, refereeId: string): Promise<Referral> {
    const referral = this.referralRepository.create({
      referrerId,
      refereeId,
      status: ReferralStatus.PENDING,
      bonusAmount: this.REFERRAL_BONUS,
    });

    const savedReferral = await this.referralRepository.save(referral);
    this.logger.log(`Referral created: ${referrerId} referred ${refereeId}`);

    return savedReferral;
  }

  /**
   * Mark referral as completed when referee completes first paid game
   */
  async completeReferral(refereeId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { refereeId, status: ReferralStatus.PENDING },
    });

    if (!referral) {
      return; // No pending referral found
    }

    // Mark as completed
    referral.status = ReferralStatus.COMPLETED;
    referral.firstGameCompleted = true;
    referral.firstGameCompletedAt = new Date();

    await this.referralRepository.save(referral);

    // Credit bonus to referrer
    await this.rewardReferrer(referral);

    this.logger.log(`Referral completed for referee ${refereeId}`);
  }

  /**
   * Reward referrer with bonus coins
   */
  private async rewardReferrer(referral: Referral): Promise<void> {
    if (referral.isRewarded) {
      return; // Already rewarded
    }

    try {
      await this.walletService.creditCoins({
        userId: referral.referrerId,
        amount: referral.bonusAmount,
        type: TransactionType.REFERRAL_BONUS,
        description: 'Referral bonus earned',
        metadata: {
          referralId: referral.id,
          refereeId: referral.refereeId,
        },
      });

      // Mark as rewarded
      referral.status = ReferralStatus.REWARDED;
      referral.isRewarded = true;
      referral.rewardedAt = new Date();

      await this.referralRepository.save(referral);

      this.logger.log(`Referrer ${referral.referrerId} rewarded with ${referral.bonusAmount} coins`);
    } catch (error) {
      this.logger.error(`Failed to reward referrer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: string, dto: GetReferralStatsDto) {
    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .where('referral.referrerId = :userId', { userId })
      .orderBy('referral.createdAt', 'DESC');

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [referrals, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const [totalReferrals, completedReferrals, totalEarned] = await Promise.all([
      this.referralRepository.count({ where: { referrerId: userId } }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.REWARDED },
      }),
      this.referralRepository
        .createQueryBuilder('r')
        .where('r.referrerId = :userId AND r.isRewarded = :isRewarded', {
          userId,
          isRewarded: true,
        })
        .select('SUM(r.bonusAmount)', 'total')
        .getRawOne()
        .then(result => result?.total || 0),
    ]);

    return {
      summary: {
        totalReferrals,
        completedReferrals,
        pendingReferrals: totalReferrals - completedReferrals,
        totalEarned: Number(totalEarned),
        conversionRate: totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0,
      },
      referrals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get top referrers leaderboard
   */
  async getTopReferrers(limit: number = 10) {
    const result = await this.referralRepository
      .createQueryBuilder('r')
      .select('r.referrerId', 'userId')
      .addSelect('COUNT(*)', 'totalReferrals')
      .addSelect('SUM(CASE WHEN r.status = :status THEN 1 ELSE 0 END)', 'completedReferrals')
      .addSelect('SUM(CASE WHEN r.isRewarded = true THEN r.bonusAmount ELSE 0 END)', 'totalEarned')
      .where('r.status != :pending', { pending: ReferralStatus.PENDING })
      .setParameter('status', ReferralStatus.REWARDED)
      .groupBy('r.referrerId')
      .orderBy('totalReferrals', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(r => ({
      userId: r.userId,
      totalReferrals: Number(r.totalReferrals),
      completedReferrals: Number(r.completedReferrals),
      totalEarned: Number(r.totalEarned),
    }));
  }
}
