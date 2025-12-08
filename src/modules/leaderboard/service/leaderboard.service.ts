import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardEntry, LeaderboardType, LeaderboardPeriod } from '../entity/leaderboard-entry.entity';
import { User } from '../../user/entity/user.entity';
import { TriviaSession, SessionStatus } from '../../trivia/entity/trivia-session.entity';
import { CacheService } from '../../../common/services/cache.service';

export interface LeaderboardQuery {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  scope?: string;
  limit?: number;
  page?: number;
}

export interface LeaderboardResult {
  entries: Array<LeaderboardEntry & { user: Partial<User> }>;
  userPosition?: {
    entry: LeaderboardEntry;
    rank: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(LeaderboardEntry)
    private readonly leaderboardRepository: Repository<LeaderboardEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TriviaSession)
    private readonly sessionRepository: Repository<TriviaSession>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get leaderboard entries with caching
   */
  async getLeaderboard(userId: string, query: LeaderboardQuery): Promise<LeaderboardResult> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    
    // Use cache for leaderboard data (10 minute TTL)
    const cacheKey = `leaderboard:${query.type}:${query.period}:${query.scope || 'global'}:${page}:${limit}`;
    
    const cached = await this.cacheService.get<LeaderboardResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    const skip = (page - 1) * limit;

    const queryBuilder = this.leaderboardRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .where('entry.type = :type', { type: query.type })
      .andWhere('entry.period = :period', { period: query.period });

    // Add scope filtering for city/tribe/campus
    if (query.type !== LeaderboardType.GLOBAL && query.scope) {
      queryBuilder.andWhere('entry.scope = :scope', { scope: query.scope });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated entries ordered by score
    const entries = await queryBuilder
      .orderBy('entry.score', 'DESC')
      .addOrderBy('entry.lastUpdated', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Update rank positions based on current order
    entries.forEach((entry, index) => {
      entry.rankPosition = skip + index + 1;
    });

    // Get current user's position
    let userPosition: LeaderboardResult['userPosition'];
    const userEntry = await queryBuilder
      .andWhere('entry.userId = :userId', { userId })
      .getOne();

    if (userEntry) {
      const rank = await queryBuilder
        .andWhere('entry.score > :score', { score: userEntry.score })
        .getCount();

      userPosition = {
        entry: userEntry,
        rank: rank + 1,
      };
    }

    const result: LeaderboardResult = {
      entries: entries.map(entry => ({
        ...entry,
        user: this.sanitizeUser(entry.user),
      })) as any,
      userPosition,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache result for 10 minutes
    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }

  /**
   * Get all leaderboard types for a user
   */
  async getUserLeaderboards(userId: string): Promise<{
    global: LeaderboardEntry;
    city: LeaderboardEntry | null;
    tribe: LeaderboardEntry | null;
    campus: LeaderboardEntry | null;
  } | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return null;
    }

    const [global, city, tribe, campus] = await Promise.all([
      this.getOrCreateEntry(userId, LeaderboardType.GLOBAL, LeaderboardPeriod.ALL_TIME),
      user.city
        ? this.getOrCreateEntry(userId, LeaderboardType.CITY, LeaderboardPeriod.ALL_TIME, user.city)
        : null,
      user.tribe
        ? this.getOrCreateEntry(userId, LeaderboardType.TRIBE, LeaderboardPeriod.ALL_TIME, user.tribe)
        : null,
      user.campus
        ? this.getOrCreateEntry(userId, LeaderboardType.CAMPUS, LeaderboardPeriod.ALL_TIME, user.campus)
        : null,
    ]);

    return { global, city, tribe, campus };
  }

  /**
   * Update leaderboard after game completion
   */
  async updateLeaderboard(userId: string, session: TriviaSession) {
    if (session.status !== SessionStatus.COMPLETED) {
      return;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    // Update all applicable leaderboards
    const updates = [
      this.updateEntry(userId, LeaderboardType.GLOBAL, LeaderboardPeriod.DAILY, null, session),
      this.updateEntry(userId, LeaderboardType.GLOBAL, LeaderboardPeriod.WEEKLY, null, session),
      this.updateEntry(userId, LeaderboardType.GLOBAL, LeaderboardPeriod.MONTHLY, null, session),
      this.updateEntry(userId, LeaderboardType.GLOBAL, LeaderboardPeriod.ALL_TIME, null, session),
    ];

    if (user.city) {
      updates.push(
        this.updateEntry(userId, LeaderboardType.CITY, LeaderboardPeriod.WEEKLY, user.city, session),
        this.updateEntry(userId, LeaderboardType.CITY, LeaderboardPeriod.ALL_TIME, user.city, session),
      );
    }

    if (user.tribe) {
      updates.push(
        this.updateEntry(userId, LeaderboardType.TRIBE, LeaderboardPeriod.WEEKLY, user.tribe, session),
        this.updateEntry(userId, LeaderboardType.TRIBE, LeaderboardPeriod.ALL_TIME, user.tribe, session),
      );
    }

    if (user.campus) {
      updates.push(
        this.updateEntry(userId, LeaderboardType.CAMPUS, LeaderboardPeriod.WEEKLY, user.campus, session),
        this.updateEntry(userId, LeaderboardType.CAMPUS, LeaderboardPeriod.ALL_TIME, user.campus, session),
      );
    }

    await Promise.all(updates);

    this.logger.log(`Updated leaderboards for user ${userId} after session ${session.id}`);
  }

  /**
   * Get top performers for a specific scope
   */
  async getTopPerformers(query: LeaderboardQuery): Promise<Array<LeaderboardEntry & { user: Partial<User> }>> {
    const limit = Math.min(query.limit || 10, 100);

    const entries = await this.leaderboardRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .where('entry.type = :type', { type: query.type })
      .andWhere('entry.period = :period', { period: query.period })
      .andWhere('entry.scope = :scope', { scope: query.scope || null })
      .orderBy('entry.score', 'DESC')
      .limit(limit)
      .getMany();

    return entries.map(entry => ({
      ...entry,
      user: this.sanitizeUser(entry.user),
    })) as any;
  }

  /**
   * Reset daily leaderboards (runs at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyLeaderboards() {
    await this.leaderboardRepository.delete({
      period: LeaderboardPeriod.DAILY,
    });

    this.logger.log('Daily leaderboards reset');
  }

  /**
   * Reset weekly leaderboards (runs every Monday at midnight)
   */
  @Cron(CronExpression.EVERY_WEEK)
  async resetWeeklyLeaderboards() {
    await this.leaderboardRepository.delete({
      period: LeaderboardPeriod.WEEKLY,
    });

    this.logger.log('Weekly leaderboards reset');
  }

  /**
   * Reset monthly leaderboards (runs on first day of month)
   */
  @Cron('0 0 1 * *')
  async resetMonthlyLeaderboards() {
    await this.leaderboardRepository.delete({
      period: LeaderboardPeriod.MONTHLY,
    });

    this.logger.log('Monthly leaderboards reset');
  }

  /**
   * Recalculate rankings for all leaderboards
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateRankings() {
    const periods = Object.values(LeaderboardPeriod);
    const types = Object.values(LeaderboardType);

    for (const period of periods) {
      for (const type of types) {
        await this.updateRankPositions(type, period);
      }
    }

    this.logger.log('Leaderboard rankings recalculated');
  }

  /**
   * Private helper: Get or create leaderboard entry
   */
  private async getOrCreateEntry(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope?: string | null,
  ): Promise<LeaderboardEntry> {
    let entry = await this.leaderboardRepository.findOne({
      where: { userId, type, period, scope: scope || undefined } as any,
    });

    if (!entry) {
      entry = this.leaderboardRepository.create({
        userId,
        type,
        period,
        scope: scope || undefined,
        score: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        totalCoinsEarned: 0,
        currentStreak: 0,
        lastUpdated: new Date(),
      });

      entry = await this.leaderboardRepository.save(entry);
    }

    return entry;
  }

  /**
   * Private helper: Update leaderboard entry
   */
  private async updateEntry(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: string | null,
    session: TriviaSession,
  ) {
    const entry = await this.getOrCreateEntry(userId, type, period, scope);

    // Update stats
    entry.gamesPlayed += 1;
    entry.gamesWon += session.accuracyPercentage >= 50 ? 1 : 0;
    entry.totalCoinsEarned = Number(entry.totalCoinsEarned) + Number(session.coinsEarned);

    // Calculate score based on performance metrics
    const scoreIncrease = this.calculateScore(session);
    entry.score = Number(entry.score) + scoreIncrease;

    entry.lastUpdated = new Date();

    await this.leaderboardRepository.save(entry);
  }

  /**
   * Private helper: Calculate score from session
   */
  private calculateScore(session: TriviaSession): number {
    // Base score from correct answers
    let score = session.correctAnswers * 10;

    // Accuracy bonus
    if (session.accuracyPercentage >= 80) {
      score += 50;
    } else if (session.accuracyPercentage >= 60) {
      score += 25;
    }

    // Perfect score bonus
    if (session.correctAnswers === session.totalQuestions) {
      score += 100;
    }

    // Time bonus (faster completion = more points)
    if (session.timeTaken) {
      const avgTimePerQuestion = session.timeTaken / session.totalQuestions;
      if (avgTimePerQuestion < 10) {
        score += 20;
      }
    }

    // XP earned contributes to score
    score += session.xpEarned;

    return score;
  }

  /**
   * Private helper: Update rank positions for a leaderboard
   */
  private async updateRankPositions(type: LeaderboardType, period: LeaderboardPeriod) {
    const entries = await this.leaderboardRepository.find({
      where: { type, period },
      order: { score: 'DESC', lastUpdated: 'ASC' },
    });

    // Group by scope for city/tribe/campus leaderboards
    if (type !== LeaderboardType.GLOBAL) {
      const scopeGroups = new Map<string, LeaderboardEntry[]>();

      entries.forEach(entry => {
        const scope = entry.scope || 'null';
        if (!scopeGroups.has(scope)) {
          scopeGroups.set(scope, []);
        }
        scopeGroups.get(scope)!.push(entry);
      });

      for (const [, scopeEntries] of scopeGroups) {
        scopeEntries.forEach((entry, index) => {
          entry.rankPosition = index + 1;
        });
      }
    } else {
      entries.forEach((entry, index) => {
        entry.rankPosition = index + 1;
      });
    }

    await this.leaderboardRepository.save(entries);
  }

  /**
   * Private helper: Sanitize user data for leaderboard
   */
  private sanitizeUser(user: User): Partial<User> {
    if (!user) return {} as Partial<User>;

    return {
      id: user.id,
      displayName: user.displayName,
      rank: user.rank,
      tribe: user.tribe,
      city: user.city,
      campus: user.campus,
    };
  }
}
