import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TriviaSession, SessionStatus } from '../entity/trivia-session.entity';
import { SubmitGameResultDto, GetTriviaSessionsDto, GetStatsDto } from '../dto';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { UsersService } from '../../user/service/users.service';
import { LeaderboardService } from '../../leaderboard/service/leaderboard.service';
import { TournamentService } from '../../tournament/service/tournament.service';
import { GamificationService } from '../../gamification/service/gamification.service';
import { QuestsService } from '../../quests/service/quests.service';
import { AchievementsService } from '../../achievements/service/achievements.service';
import { QuestType } from '../../quests/entity/quest.entity';
import { AchievementType } from '../../achievements/entity/achievement.entity';
import { GameSessionService } from './game-session.service';

@Injectable()
export class TriviaService {
  private readonly logger = new Logger(TriviaService.name);

  constructor(
    @InjectRepository(TriviaSession)
    private readonly sessionRepository: Repository<TriviaSession>,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly leaderboardService: LeaderboardService,
    private readonly tournamentService: TournamentService,
    private readonly gamificationService: GamificationService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
    private readonly gameSessionService: GameSessionService,
  ) {}

  /**
   * Submit game result from frontend (with session validation)
   */
  async submitGameResult(userId: string, dto: SubmitGameResultDto) {
    // Validate session token
    const activeSession = await this.gameSessionService.validateSession(
      userId,
      dto.sessionToken,
    );

    // Validate input
    if (dto.correctAnswers + dto.wrongAnswers !== dto.totalQuestions) {
      throw new BadRequestException('Answers don\'t match total questions');
    }

    if (dto.correctAnswers > dto.totalQuestions) {
      throw new BadRequestException('Invalid correct answers count');
    }

    // Validate question count matches session
    if (dto.totalQuestions !== activeSession.totalQuestions) {
      throw new BadRequestException('Question count does not match session');
    }

    // Check rate limiting
    await this.checkSessionCooldown(userId);

    // Check daily limits
    await this.checkDailyLimits(userId);

    // Entry fee already paid during session creation - no additional debit needed

    // Calculate stats
    const accuracy = dto.totalQuestions > 0 
      ? (dto.correctAnswers / dto.totalQuestions) * 100 
      : 0;

    // Calculate rewards (entry fee already paid, so no stake consideration)
    const coinsEarned = this.calculateCoinsEarned({
      correctAnswers: dto.correctAnswers,
      totalQuestions: dto.totalQuestions,
      stakeAmount: 0, // No additional stake
      accuracy,
    });

    const xpEarned = this.calculateXPEarned({
      correctAnswers: dto.correctAnswers,
      totalQuestions: dto.totalQuestions,
    });

    // Check daily coin limit
    await this.validateDailyCoinLimit(userId, coinsEarned);

    // Create session record
    const session = this.sessionRepository.create({
      userId,
      mode: dto.mode,
      status: SessionStatus.COMPLETED,
      stakeAmount: activeSession.entryFee, // Record the entry fee paid
      totalQuestions: dto.totalQuestions,
      correctAnswers: dto.correctAnswers,
      wrongAnswers: dto.wrongAnswers,
      coinsEarned,
      xpEarned,
      accuracyPercentage: accuracy,
      timeTaken: dto.timeTaken || 0,
      completedAt: new Date(),
      tournamentId: dto.tournamentId || activeSession.metadata?.tournamentId,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Mark active session as completed
    await this.gameSessionService.completeSession(dto.sessionToken);

    // Credit coins if earned
    if (coinsEarned > 0) {
      await this.walletService.creditCoins({
        userId,
        amount: coinsEarned,
        type: TransactionType.COIN_EARN,
        description: `Trivia game reward`,
        metadata: {
          sessionId: savedSession.id,
          correctAnswers: dto.correctAnswers,
          accuracy: accuracy.toFixed(2),
        },
      });

      // Update daily limits
      await this.incrementDailyLimits(userId, coinsEarned);
    }

    // Update user stats
    await this.usersService.updateGameStats(userId, {
      won: accuracy >= 50,
      xpEarned,
      streakIncrement: true,
    });

    // Update leaderboard
    try {
      await this.leaderboardService.updateLeaderboard(userId, savedSession);
    } catch (error) {
      this.logger.error(`Failed to update leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update tournament if applicable
    if (dto.tournamentId) {
      try {
        await this.tournamentService.updateParticipantScore(
          userId,
          dto.tournamentId,
          savedSession,
        );
      } catch (error) {
        this.logger.error(`Failed to update tournament score: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update user streak
    try {
      await this.gamificationService.updateStreak(userId);
    } catch (error) {
      this.logger.error(`Failed to update streak: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update quest progress
    try {
      await this.questsService.updateQuestProgress(userId, {
        questType: QuestType.PLAY_GAMES,
        progress: 1,
      });

      if (accuracy >= 50) {
        await this.questsService.updateQuestProgress(userId, {
          questType: QuestType.WIN_GAMES,
          progress: 1,
        });
      }

      if (accuracy === 100) {
        await this.questsService.updateQuestProgress(userId, {
          questType: QuestType.PERFECT_SCORE,
          progress: 1,
        });
      }

      if (coinsEarned > 0) {
        await this.questsService.updateQuestProgress(userId, {
          questType: QuestType.EARN_COINS,
          progress: coinsEarned,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update quest progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update achievement progress
    try {
      await this.achievementsService.updateAchievementProgress(userId, {
        achievementType: AchievementType.GAMES_PLAYED,
        progress: 1,
      });

      if (accuracy >= 50) {
        await this.achievementsService.updateAchievementProgress(userId, {
          achievementType: AchievementType.GAMES_WON,
          progress: 1,
        });
      }

      if (accuracy === 100) {
        await this.achievementsService.updateAchievementProgress(userId, {
          achievementType: AchievementType.PERFECT_SCORES,
          progress: 1,
        });
      }

      if (coinsEarned > 0) {
        await this.achievementsService.updateAchievementProgress(userId, {
          achievementType: AchievementType.TOTAL_COINS,
          progress: coinsEarned,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update achievement progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.logger.log(`Game completed for user ${userId}: ${coinsEarned} coins, ${xpEarned} XP earned`);

    return {
      session: savedSession,
      accuracy: Number(accuracy.toFixed(2)),
      coinsEarned,
      xpEarned,
      passed: accuracy >= 50,
    };
  }

  /**
   * Get user's session history
   */
  async getUserSessions(userId: string, dto: GetTriviaSessionsDto) {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC');

    if (dto.mode) {
      queryBuilder.andWhere('session.mode = :mode', { mode: dto.mode });
    }

    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100); // Max 100
    const skip = (page - 1) * limit;

    const [sessions, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's statistics
   */
  async getUserStats(userId: string, dto: GetStatsDto) {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.status = :status', { status: SessionStatus.COMPLETED });

    if (dto.mode) {
      queryBuilder.andWhere('session.mode = :mode', { mode: dto.mode });
    }

    // Filter by period
    if (dto.period && dto.period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dto.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      if (startDate) {
        queryBuilder.andWhere('session.createdAt >= :startDate', { startDate });
      }
    }

    const sessions = await queryBuilder.getMany();

    const stats = {
      totalGames: sessions.length,
      totalQuestions: sessions.reduce((sum, s) => sum + s.totalQuestions, 0),
      correctAnswers: sessions.reduce((sum, s) => sum + s.correctAnswers, 0),
      wrongAnswers: sessions.reduce((sum, s) => sum + s.wrongAnswers, 0),
      totalCoinsEarned: sessions.reduce((sum, s) => sum + Number(s.coinsEarned), 0),
      totalXpEarned: sessions.reduce((sum, s) => sum + s.xpEarned, 0),
      averageAccuracy: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + Number(s.accuracyPercentage), 0) / sessions.length
        : 0,
      gamesWon: sessions.filter(s => Number(s.accuracyPercentage) >= 50).length,
      gamesLost: sessions.filter(s => Number(s.accuracyPercentage) < 50).length,
      perfectGames: sessions.filter(s => Number(s.accuracyPercentage) === 100).length,
      averageTimeTaken: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.timeTaken || 0), 0) / sessions.length
        : 0,
    };

    return stats;
  }

  /**
   * Calculate coins earned based on performance
   */
  private calculateCoinsEarned(params: {
    correctAnswers: number;
    totalQuestions: number;
    stakeAmount: number;
    accuracy: number;
  }): number {
    const baseCoins = params.correctAnswers * 10;
    const accuracyBonus = params.accuracy >= 80 ? 20 : 0;
    const stakePayout = params.stakeAmount > 0 ? params.stakeAmount * 1.5 : 0;

    return baseCoins + accuracyBonus + stakePayout;
  }

  /**
   * Calculate XP earned based on performance
   */
  private calculateXPEarned(params: {
    correctAnswers: number;
    totalQuestions: number;
  }): number {
    const baseXP = params.correctAnswers * 5;
    const perfectBonus = params.correctAnswers === params.totalQuestions ? 25 : 0;

    return baseXP + perfectBonus;
  }

  /**
   * Check session cooldown (10s between sessions)
   */
  private async checkSessionCooldown(userId: string): Promise<void> {
    const lastSession = await this.sessionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (lastSession) {
      const timeSinceLastSession = Date.now() - new Date(lastSession.createdAt).getTime();
      const cooldownPeriod = 10000; // 10 seconds

      if (timeSinceLastSession < cooldownPeriod) {
        const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastSession) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingTime} seconds before starting a new session`,
        );
      }
    }
  }

  /**
   * Check daily limits (sessions and coins)
   */
  private async checkDailyLimits(userId: string): Promise<void> {
    const wallet = await this.walletService.getWalletByUserId(userId);

    // Reset daily limits if it's a new day
    const lastReset = wallet.lastLimitReset ? new Date(wallet.lastLimitReset) : null;
    const now = new Date();
    const isNewDay = !lastReset ||
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    if (isNewDay) {
      return;
    }

    // Daily limits
    const MAX_SESSIONS_PER_DAY = 50;
    const MAX_COINS_PER_DAY = 5000;

    if (wallet.dailySessionsPlayed >= MAX_SESSIONS_PER_DAY) {
      throw new BadRequestException(
        `Daily session limit reached (${MAX_SESSIONS_PER_DAY} sessions per day)`,
      );
    }

    if (Number(wallet.dailyCoinsEarned) >= MAX_COINS_PER_DAY) {
      throw new BadRequestException(
        `Daily coin earning limit reached (${MAX_COINS_PER_DAY} coins per day)`,
      );
    }
  }

  /**
   * Validate daily coin limit before awarding
   */
  private async validateDailyCoinLimit(userId: string, coinsToAward: number): Promise<void> {
    const wallet = await this.walletService.getWalletByUserId(userId);
    const MAX_COINS_PER_DAY = 5000;

    const lastReset = wallet.lastLimitReset ? new Date(wallet.lastLimitReset) : null;
    const now = new Date();
    const isNewDay = !lastReset ||
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    if (!isNewDay) {
      const currentDailyCoins = Number(wallet.dailyCoinsEarned);
      if (currentDailyCoins + coinsToAward > MAX_COINS_PER_DAY) {
        const remainingCoins = MAX_COINS_PER_DAY - currentDailyCoins;
        throw new BadRequestException(
          `Daily coin limit would be exceeded. You can earn ${remainingCoins} more coins today.`,
        );
      }
    }
  }

  /**
   * Increment daily limits after successful session
   */
  private async incrementDailyLimits(userId: string, coinsEarned: number): Promise<void> {
    const wallet = await this.walletService.getWalletByUserId(userId);

    const lastReset = wallet.lastLimitReset ? new Date(wallet.lastLimitReset) : null;
    const now = new Date();
    const isNewDay = !lastReset ||
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    if (isNewDay) {
      wallet.dailyCoinsEarned = coinsEarned;
      wallet.dailySessionsPlayed = 1;
      wallet.lastLimitReset = now;
    } else {
      wallet.dailyCoinsEarned = Number(wallet.dailyCoinsEarned) + coinsEarned;
      wallet.dailySessionsPlayed += 1;
    }

    await this.walletService['walletRepository'].save(wallet);
  }

  // ===== Delegate methods to GameSessionService =====

  async getCategories() {
    return this.gameSessionService.getCategories();
  }

  async calculatePricing(questionCount?: number, difficulty?: string) {
    return this.gameSessionService.calculatePricing(questionCount, difficulty);
  }

  async startGameSession(userId: string, dto: any) {
    return this.gameSessionService.startGameSession(userId, dto);
  }

  async verifyDirectPayment(userId: string, sessionToken: string, paymentReference: string) {
    return this.gameSessionService.verifyDirectPayment(userId, sessionToken, paymentReference);
  }

  async getQuestionsForSession(userId: string, sessionToken: string) {
    return this.gameSessionService.getQuestionsForSession(userId, sessionToken);
  }
}
