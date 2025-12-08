import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TriviaQuestion, DifficultyLevel } from '../entity/trivia-question.entity';
import { TriviaSession, SessionStatus, SessionMode } from '../entity/trivia-session.entity';
import { TriviaSessionAnswer } from '../entity/trivia-session-answer.entity';
import { TriviaCategory } from '../entity/trivia-category.entity';
import { TriviaPack } from '../entity/trivia-pack.entity';
import {
  StartTriviaSessionDto,
  SubmitAnswerDto,
  GetTriviaSessionsDto,
  GetQuestionsDto,
  CreateTriviaQuestionDto,
  CreateCategoryDto,
  CreateTriviaPackDto,
} from '../dto';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { UsersService } from '../../user/service/users.service';
import { LeaderboardService } from '../../leaderboard/service/leaderboard.service';
import { TournamentService } from '../../tournament/service/tournament.service';
import { GamificationService } from '../../gamification/service/gamification.service';

@Injectable()
export class TriviaService {
  private readonly logger = new Logger(TriviaService.name);

  constructor(
    @InjectRepository(TriviaQuestion)
    private readonly questionRepository: Repository<TriviaQuestion>,
    @InjectRepository(TriviaSession)
    private readonly sessionRepository: Repository<TriviaSession>,
    @InjectRepository(TriviaSessionAnswer)
    private readonly answerRepository: Repository<TriviaSessionAnswer>,
    @InjectRepository(TriviaCategory)
    private readonly categoryRepository: Repository<TriviaCategory>,
    @InjectRepository(TriviaPack)
    private readonly packRepository: Repository<TriviaPack>,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly leaderboardService: LeaderboardService,
    private readonly tournamentService: TournamentService,
    private readonly gamificationService: GamificationService,
  ) {}

  /**
   * Start a new trivia session
   */
  async startSession(userId: string, dto: StartTriviaSessionDto): Promise<{
    session: TriviaSession;
    questions: TriviaQuestion[];
  }> {
    // Validate and debit stake amount if provided
    if (dto.stakeAmount && dto.stakeAmount > 0) {
      await this.walletService.debitCoins({
        userId,
        amount: dto.stakeAmount,
        type: TransactionType.COIN_SPEND,
        description: `Trivia ${dto.mode} entry fee`,
        metadata: { mode: dto.mode },
      });
    }

    // Get random questions based on criteria
    const questions = await this.getRandomQuestions({
      categoryId: dto.categoryId,
      packId: dto.packId,
      difficulty: dto.difficulty,
      limit: dto.questionCount || 10,
    });

    if (questions.length === 0) {
      throw new BadRequestException('No questions available for the selected criteria');
    }

    // Create session
    const session = this.sessionRepository.create({
      userId,
      mode: dto.mode,
      status: SessionStatus.IN_PROGRESS,
      stakeAmount: dto.stakeAmount || 0,
      totalQuestions: questions.length,
      startedAt: new Date(),
      tournamentId: dto.tournamentId,
    });

    const savedSession = await this.sessionRepository.save(session);

    this.logger.log(`Trivia session ${savedSession.id} started for user ${userId}`);

    return {
      session: savedSession,
      questions: questions.map(q => this.sanitizeQuestion(q)) as TriviaQuestion[],
    };
  }

  /**
   * Submit an answer for a question
   */
  async submitAnswer(userId: string, dto: SubmitAnswerDto) {
    const session = await this.sessionRepository.findOne({
      where: { id: dto.sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not active');
    }

    const question = await this.questionRepository.findOne({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect = dto.selectedAnswer === question.correctAnswer;

    // Create answer record
    const answer = this.answerRepository.create({
      sessionId: session.id,
      questionId: question.id,
      userAnswer: dto.selectedAnswer,
      isCorrect,
      timeTaken: dto.timeSpent || 0,
      pointsEarned: isCorrect ? question.pointsValue : 0,
    });

    await this.answerRepository.save(answer);

    // Update session stats
    if (isCorrect) {
      session.correctAnswers += 1;
    } else {
      session.wrongAnswers += 1;
    }

    await this.sessionRepository.save(session);

    this.logger.log(`Answer submitted for session ${session.id}: ${isCorrect ? 'correct' : 'wrong'}`);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      pointsEarned: answer.pointsEarned,
      explanation: question.explanation,
    };
  }

  /**
   * Complete a trivia session
   */
  async completeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['answers'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session already completed');
    }

    // Calculate stats
    const totalAnswered = session.correctAnswers + session.wrongAnswers;
    const accuracy = totalAnswered > 0 ? (session.correctAnswers / totalAnswered) * 100 : 0;

    // Calculate coins and XP earned
    const coinsEarned = this.calculateCoinsEarned(session);
    const xpEarned = this.calculateXPEarned(session);

    // Update session
    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    session.accuracyPercentage = accuracy;
    session.coinsEarned = coinsEarned;
    session.xpEarned = xpEarned;
    session.timeTaken = session.answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0);

    await this.sessionRepository.save(session);

    // Credit coins if earned
    if (coinsEarned > 0) {
      await this.walletService.creditCoins({
        userId,
        amount: coinsEarned,
        type: TransactionType.COIN_EARN,
        description: `Trivia session reward`,
        metadata: {
          sessionId: session.id,
          correctAnswers: session.correctAnswers,
          accuracy: accuracy.toFixed(2),
        },
      });
    }

    // Update user stats
    await this.usersService.updateGameStats(userId, {
      won: accuracy >= 50,
      xpEarned,
      streakIncrement: true,
    });

    // Update leaderboard
    try {
      await this.leaderboardService.updateLeaderboard(userId, session);
    } catch (error) {
      this.logger.error(`Failed to update leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update tournament if applicable
    if (session.tournamentId) {
      try {
        await this.tournamentService.updateParticipantScore(
          userId,
          session.tournamentId,
          session,
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

    this.logger.log(`Session ${sessionId} completed: ${coinsEarned} coins, ${xpEarned} XP earned`);

    return {
      session,
      totalAnswered,
      accuracy: Number(accuracy.toFixed(2)),
      coinsEarned,
      xpEarned,
      passed: accuracy >= 50,
    };
  }

  /**
   * Get user's trivia sessions
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
    const limit = dto.limit || 20;
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
   * Get session details
   */
  async getSessionDetails(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['answers'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get full question details for answers
    const questionIds = session.answers.map(a => a.questionId);
    const questions = await this.questionRepository.find({
      where: { id: In(questionIds) },
    });

    const questionsMap = new Map(questions.map(q => [q.id, q]));

    const answersWithDetails = session.answers.map(answer => {
      const question = questionsMap.get(answer.questionId);
      return {
        ...answer,
        question: question ? this.sanitizeQuestion(question) : null,
      };
    });

    return {
      session,
      answers: answersWithDetails,
    };
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get all trivia packs
   */
  async getTriviaPacks() {
    return await this.packRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create user-generated trivia question
   */
  async createUserQuestion(userId: string, dto: CreateTriviaQuestionDto) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.packId) {
      const pack = await this.packRepository.findOne({
        where: { id: dto.packId },
      });
      if (!pack) {
        throw new NotFoundException('Pack not found');
      }
    }

    // Validate options include correct answer
    if (!dto.options.includes(dto.correctAnswer)) {
      throw new BadRequestException('Correct answer must be one of the options');
    }

    const question = this.questionRepository.create({
      ...dto,
      createdBy: userId,
      isApproved: false, // Requires admin approval
      isActive: false,
    });

    const savedQuestion = await this.questionRepository.save(question);

    this.logger.log(`User ${userId} created trivia question ${savedQuestion.id}`);

    return savedQuestion;
  }

  /**
   * Create category (admin only)
   */
  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoryRepository.findOne({
      where: [{ name: dto.name }, { slug: dto.slug }],
    });

    if (existing) {
      throw new BadRequestException('Category name or slug already exists');
    }

    const category = this.categoryRepository.create(dto);
    return await this.categoryRepository.save(category);
  }

  /**
   * Create trivia pack (admin only)
   */
  async createTriviaPack(dto: CreateTriviaPackDto) {
    const existing = await this.packRepository.findOne({
      where: [{ name: dto.name }, { slug: dto.slug }],
    });

    if (existing) {
      throw new BadRequestException('Pack name or slug already exists');
    }

    const pack = this.packRepository.create(dto);
    return await this.packRepository.save(pack);
  }

  /**
   * Get user trivia creation stats
   */
  async getUserCreationStats(userId: string) {
    const [totalSubmitted, totalApproved, totalPlayed] = await Promise.all([
      this.questionRepository.count({ where: { createdBy: userId } }),
      this.questionRepository.count({ where: { createdBy: userId, isApproved: true } }),
      this.questionRepository
        .createQueryBuilder('q')
        .where('q.createdBy = :userId', { userId })
        .select('SUM(q.usageCount)', 'total')
        .getRawOne()
        .then(result => result?.total || 0),
    ]);

    return {
      totalSubmitted,
      totalApproved,
      totalPlayed: Number(totalPlayed),
      approvalRate: totalSubmitted > 0 ? (totalApproved / totalSubmitted) * 100 : 0,
    };
  }

  /**
   * Get random questions based on criteria
   */
  private async getRandomQuestions(dto: GetQuestionsDto): Promise<TriviaQuestion[]> {
    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.isActive = :isActive', { isActive: true })
      .andWhere('question.isApproved = :isApproved', { isApproved: true });

    if (dto.categoryId) {
      queryBuilder.andWhere('question.categoryId = :categoryId', { categoryId: dto.categoryId });
    }

    if (dto.packId) {
      queryBuilder.andWhere('question.packId = :packId', { packId: dto.packId });
    }

    if (dto.difficulty) {
      queryBuilder.andWhere('question.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    const questions = await queryBuilder.orderBy('RANDOM()').limit(dto.limit || 10).getMany();

    // Increment usage count
    if (questions.length > 0) {
      await this.questionRepository.increment(
        { id: In(questions.map(q => q.id)) },
        'usageCount',
        1,
      );
    }

    return questions;
  }

  /**
   * Calculate coins earned based on performance
   */
  private calculateCoinsEarned(session: TriviaSession): number {
    const baseCoins = session.correctAnswers * 10;
    const accuracyBonus = session.correctAnswers / session.totalQuestions >= 0.8 ? 20 : 0;
    const stakePayout = session.stakeAmount > 0 ? session.stakeAmount * 1.5 : 0;

    return baseCoins + accuracyBonus + stakePayout;
  }

  /**
   * Calculate XP earned based on performance
   */
  private calculateXPEarned(session: TriviaSession): number {
    const baseXP = session.correctAnswers * 5;
    const perfectBonus = session.correctAnswers === session.totalQuestions ? 25 : 0;

    return baseXP + perfectBonus;
  }

  /**
   * Sanitize question (remove correct answer for client)
   */
  private sanitizeQuestion(question: TriviaQuestion): Partial<TriviaQuestion> {
    const { correctAnswer, createdBy, isApproved, usageCount, ...sanitized } = question;
    return sanitized;
  }
}
