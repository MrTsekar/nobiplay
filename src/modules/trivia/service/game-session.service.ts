import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ActiveGameSession, GameSessionStatus, PaymentType } from '../entity/active-game-session.entity';
import { StartGameDto, calculateEntryFee, DEFAULT_TRIVIA_PRICING } from '../dto';
import { WalletService } from '../../wallet/service/wallet.service';
import { PaymentService } from '../../payment/service/payment.service';
import { PaymentStatus } from '../../payment/entity/payment-transaction.entity';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { CacheService } from '../../../common/services/cache.service';
import axios from 'axios';
import { randomBytes } from 'crypto';

@Injectable()
export class GameSessionService {
  private readonly logger = new Logger(GameSessionService.name);
  private readonly SESSION_EXPIRY_MINUTES = 30; // 30 minutes to complete a game
  private readonly OPENTRIVIA_API = 'https://opentri via.com/api.php';
  private readonly CATEGORIES_CACHE_KEY = 'trivia:categories';
  private readonly CATEGORIES_CACHE_TTL = 86400; // 24 hours

  constructor(
    @InjectRepository(ActiveGameSession)
    private readonly sessionRepository: Repository<ActiveGameSession>,
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get trivia categories from Open Trivia DB
   */
  async getCategories() {
    // Try cache first
    const cached = await this.cacheService.get<any>(this.CATEGORIES_CACHE_KEY);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get('https://opentdb.com/api_category.php');
      const categories = response.data.trivia_categories;

      // Cache for 24 hours
      await this.cacheService.set(this.CATEGORIES_CACHE_KEY, categories, this.CATEGORIES_CACHE_TTL);

      return categories;
    } catch (error) {
      this.logger.error(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to fetch trivia categories');
    }
  }

  /**
   * Calculate pricing for a game
   */
  calculatePricing(questionCount?: number, difficulty?: string) {
    const count = questionCount || 10;
    const diff = difficulty || 'easy';
    
    const entryFee = calculateEntryFee(count, diff);
    const potentialReward = count * 10; // 10 coins per correct answer

    return {
      questionCount: count,
      difficulty: diff,
      entryFee,
      potentialReward,
      maxReward: potentialReward,
      pricing: DEFAULT_TRIVIA_PRICING,
    };
  }

  /**
   * Start a new game session with payment
   */
  async startGameSession(userId: string, dto: StartGameDto) {
    // Calculate entry fee
    const entryFee = calculateEntryFee(dto.totalQuestions, dto.difficulty);

    // Generate unique session token
    const sessionToken = this.generateSessionToken();

    // Clean up any expired sessions for this user
    await this.cleanupExpiredSessions(userId);

    // Check if user has active session
    const existingSession = await this.sessionRepository.findOne({
      where: {
        userId,
        status: GameSessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      throw new BadRequestException('You already have an active game session');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.SESSION_EXPIRY_MINUTES);

    // Handle payment based on type
    if (dto.paymentType === PaymentType.WALLET) {
      // Debit from wallet immediately
      await this.walletService.debitCoins({
        userId,
        amount: entryFee,
        type: TransactionType.COIN_SPEND,
        description: `Trivia game entry (${dto.totalQuestions} questions)`,
        metadata: {
          sessionToken,
          questionCount: dto.totalQuestions,
          difficulty: dto.difficulty,
          category: dto.category,
        },
      });

      // Create active session
      const session = this.sessionRepository.create({
        userId,
        sessionToken,
        status: GameSessionStatus.ACTIVE,
        mode: dto.mode,
        totalQuestions: dto.totalQuestions,
        category: dto.category,
        difficulty: dto.difficulty,
        entryFee,
        paymentType: PaymentType.WALLET,
        paymentVerified: true,
        expiresAt,
        metadata: {
          tournamentId: dto.tournamentId,
        },
      });

      await this.sessionRepository.save(session);

      return {
        sessionToken,
        entryFee,
        paymentType: 'wallet',
        expiresAt,
        message: 'Payment deducted from wallet. You can start playing now.',
      };
    } else {
      // Direct payment - create pending session
      const paymentInit = await this.paymentService.initiatePayment(userId, {
        provider: 'paystack' as any,
        amount: entryFee,
        currency: 'NGN',
        description: `Trivia game entry (${dto.totalQuestions} questions)`,
        method: 'card' as any,
        customerEmail: '', // Filled by service from user profile
        metadata: {
          sessionToken,
          questionCount: dto.totalQuestions,
          difficulty: dto.difficulty,
        },
      });

      const session = this.sessionRepository.create({
        userId,
        sessionToken,
        status: GameSessionStatus.ACTIVE,
        mode: dto.mode,
        totalQuestions: dto.totalQuestions,
        category: dto.category,
        difficulty: dto.difficulty,
        entryFee,
        paymentType: PaymentType.DIRECT,
        paymentReference: paymentInit.reference,
        paymentVerified: false,
        expiresAt,
        metadata: {
          tournamentId: dto.tournamentId,
        },
      });

      await this.sessionRepository.save(session);

      return {
        sessionToken,
        entryFee,
        paymentType: 'direct',
        paymentReference: paymentInit.reference,
        paymentUrl: paymentInit.paymentUrl,
        expiresAt,
        message: 'Complete payment to start playing',
      };
    }
  }

  /**
   * Verify direct payment
   */
  async verifyDirectPayment(userId: string, sessionToken: string, paymentReference: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken, userId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.paymentType !== PaymentType.DIRECT) {
      throw new BadRequestException('This session does not require payment verification');
    }

    if (session.paymentVerified) {
      return {
        verified: true,
        message: 'Payment already verified',
      };
    }

    // Verify payment with payment gateway - pass string directly
    const verifyResult = await this.paymentService.verifyPayment(userId, {
      reference: paymentReference,
      provider: 'paystack' as any,
    } as any);

    if (!verifyResult || verifyResult.status !== PaymentStatus.SUCCESS as any) {
      throw new BadRequestException('Payment verification failed');
    }

    // Update session
    session.paymentVerified = true;
    session.paymentReference = paymentReference;
    await this.sessionRepository.save(session);

    return {
      verified: true,
      sessionToken,
      message: 'Payment verified. You can start playing now.',
    };
  }

  /**
   * Get questions for an active session
   */
  async getQuestionsForSession(userId: string, sessionToken: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken, userId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BadRequestException('This session is no longer active');
    }

    if (!session.paymentVerified) {
      throw new BadRequestException('Payment not verified. Please complete payment first.');
    }

    if (new Date() > session.expiresAt) {
      session.status = GameSessionStatus.EXPIRED;
      await this.sessionRepository.save(session);
      throw new BadRequestException('Session has expired');
    }

    // Mark session as started
    if (!session.startedAt) {
      session.startedAt = new Date();
      await this.sessionRepository.save(session);
    }

    // Fetch questions from Open Trivia DB
    try {
      let apiUrl = `https://opentdb.com/api.php?amount=${session.totalQuestions}`;
      
      if (session.category) {
        apiUrl += `&category=${session.category}`;
      }
      
      if (session.difficulty) {
        apiUrl += `&difficulty=${session.difficulty}`;
      }

      const response = await axios.get(apiUrl);
      
      if (response.data.response_code !== 0) {
        throw new Error('Failed to fetch questions from API');
      }

      return {
        sessionToken,
        questions: response.data.results,
        expiresAt: session.expiresAt,
        entryFee: session.entryFee,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to fetch trivia questions');
    }
  }

  /**
   * Validate and get active session
   */
  async validateSession(userId: string, sessionToken: string): Promise<ActiveGameSession> {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken, userId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is ${session.status}`);
    }

    if (!session.paymentVerified) {
      throw new BadRequestException('Payment not verified');
    }

    if (new Date() > session.expiresAt) {
      session.status = GameSessionStatus.EXPIRED;
      await this.sessionRepository.save(session);
      throw new BadRequestException('Session has expired');
    }

    return session;
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionToken: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken },
    });

    if (session) {
      session.status = GameSessionStatus.COMPLETED;
      session.completedAt = new Date();
      await this.sessionRepository.save(session);
    }
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(userId?: string) {
    const query: any = {
      status: GameSessionStatus.ACTIVE,
      expiresAt: LessThan(new Date()),
    };

    if (userId) {
      query.userId = userId;
    }

    await this.sessionRepository.update(query, {
      status: GameSessionStatus.EXPIRED,
    });
  }

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return `trivia_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }
}
