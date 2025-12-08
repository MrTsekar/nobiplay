import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Tournament, TournamentStatus, TournamentType } from '../entity/tournament.entity';
import { TournamentParticipant, ParticipantStatus } from '../entity/tournament-participant.entity';
import { TournamentBet, BetType, BetStatus } from '../entity/tournament-bet.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { TriviaSession } from '../../trivia/entity/trivia-session.entity';

export interface CreateTournamentDto {
  name: string;
  description?: string;
  type: TournamentType;
  entryFee: number;
  prizePool: number;
  maxParticipants?: number;
  totalQuestions?: number;
  questionTimeLimit?: number;
  livesPerPlayer?: number;
  categoryId?: string;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  banner?: string;
}

export interface PlaceBetDto {
  tournamentId: string;
  type: BetType;
  stakeAmount: number;
  prediction: {
    userId?: string;
    categoryId?: string;
    threshold?: number;
  };
}

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: Repository<TournamentParticipant>,
    @InjectRepository(TournamentBet)
    private readonly betRepository: Repository<TournamentBet>,
    @InjectRepository(TriviaSession)
    private readonly sessionRepository: Repository<TriviaSession>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a new tournament (admin only)
   */
  async createTournament(dto: CreateTournamentDto): Promise<Tournament> {
    const existing = await this.tournamentRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Tournament with this name already exists');
    }

    const tournament = this.tournamentRepository.create(dto);
    return await this.tournamentRepository.save(tournament);
  }

  /**
   * Get all tournaments with filters
   */
  async getTournaments(filters?: {
    status?: TournamentStatus;
    type?: TournamentType;
  }): Promise<Tournament[]> {
    const query = this.tournamentRepository.createQueryBuilder('tournament');

    if (filters?.status) {
      query.andWhere('tournament.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('tournament.type = :type', { type: filters.type });
    }

    return await query.orderBy('tournament.startsAt', 'ASC').getMany();
  }

  /**
   * Get tournament details with participants
   */
  async getTournamentDetails(tournamentId: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ['participants', 'participants.user'],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  /**
   * Register for a tournament
   */
  async registerForTournament(
    userId: string,
    tournamentId: string,
  ): Promise<TournamentParticipant> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if registration is open
    const now = new Date();
    if (now < tournament.registrationOpensAt || now > tournament.registrationClosesAt) {
      throw new BadRequestException('Registration is not open for this tournament');
    }

    // Check if tournament is full
    if (
      tournament.maxParticipants &&
      tournament.currentParticipants >= tournament.maxParticipants
    ) {
      throw new BadRequestException('Tournament is full');
    }

    // Check if already registered
    const existing = await this.participantRepository.findOne({
      where: { tournamentId, userId },
    });

    if (existing) {
      throw new BadRequestException('Already registered for this tournament');
    }

    // Debit entry fee
    if (tournament.entryFee > 0) {
      await this.walletService.debitCoins({
        userId,
        amount: tournament.entryFee,
        type: TransactionType.COIN_SPEND,
        description: `Tournament entry: ${tournament.name}`,
        metadata: { tournamentId },
      });

      // Add to prize pool
      tournament.prizePool = Number(tournament.prizePool) + Number(tournament.entryFee);
    }

    // Create participant
    const participant = this.participantRepository.create({
      tournamentId,
      userId,
      livesRemaining: tournament.livesPerPlayer,
    });

    // Update participant count
    tournament.currentParticipants += 1;
    await this.tournamentRepository.save(tournament);

    this.logger.log(`User ${userId} registered for tournament ${tournamentId}`);

    return await this.participantRepository.save(participant);
  }

  /**
   * Place a bet on tournament outcome
   */
  async placeBet(userId: string, dto: PlaceBetDto): Promise<TournamentBet> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: dto.tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Can't bet after tournament starts
    if (tournament.status !== TournamentStatus.UPCOMING &&
        tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Cannot place bets after tournament starts');
    }

    // Validate prediction based on bet type
    this.validateBetPrediction(dto.type, dto.prediction);

    // Calculate potential payout (basic odds system)
    const potentialPayout = await this.calculatePotentialPayout(dto);

    // Debit stake amount
    await this.walletService.debitCoins({
      userId,
      amount: dto.stakeAmount,
      type: TransactionType.COIN_SPEND,
      description: `Tournament bet: ${tournament.name}`,
      metadata: {
        tournamentId: dto.tournamentId,
        betType: dto.type,
      },
    });

    // Create bet
    const bet = this.betRepository.create({
      tournamentId: dto.tournamentId,
      userId,
      type: dto.type,
      stakeAmount: dto.stakeAmount,
      potentialPayout,
      prediction: dto.prediction,
    });

    this.logger.log(`User ${userId} placed bet on tournament ${dto.tournamentId}`);

    return await this.betRepository.save(bet);
  }

  /**
   * Get user's bets for a tournament
   */
  async getUserBets(userId: string, tournamentId?: string): Promise<TournamentBet[]> {
    const query = this.betRepository.createQueryBuilder('bet').where('bet.userId = :userId', {
      userId,
    });

    if (tournamentId) {
      query.andWhere('bet.tournamentId = :tournamentId', { tournamentId });
    }

    return await query
      .leftJoinAndSelect('bet.tournament', 'tournament')
      .orderBy('bet.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Update participant score after session completion
   */
  async updateParticipantScore(
    userId: string,
    tournamentId: string,
    session: TriviaSession,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId },
    });

    if (!participant) {
      return;
    }

    // Update score and stats
    participant.questionsAnswered += session.totalQuestions;
    participant.correctAnswers += session.correctAnswers;
    participant.score += session.coinsEarned;
    participant.timeTaken = (participant.timeTaken || 0) + (session.timeTaken || 0);

    // Deduct lives for wrong answers
    if (session.wrongAnswers > 0) {
      participant.livesRemaining = Math.max(0, participant.livesRemaining - session.wrongAnswers);
    }

    // Mark as completed if out of lives or questions
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (
      participant.livesRemaining === 0 ||
      (tournament && participant.questionsAnswered >= tournament.totalQuestions)
    ) {
      participant.status = ParticipantStatus.COMPLETED;
    }

    await this.participantRepository.save(participant);
  }

  /**
   * Get tournament leaderboard
   */
  async getTournamentLeaderboard(tournamentId: string): Promise<TournamentParticipant[]> {
    return await this.participantRepository.find({
      where: { tournamentId },
      relations: ['user'],
      order: {
        score: 'DESC',
        timeTaken: 'ASC',
      },
    });
  }

  /**
   * Complete tournament and distribute prizes
   */
  async completeTournament(tournamentId: string): Promise<void> {
    const tournament = await this.getTournamentDetails(tournamentId);

    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new BadRequestException('Tournament already completed');
    }

    // Get final leaderboard
    const leaderboard = await this.getTournamentLeaderboard(tournamentId);

    // Update rankings
    leaderboard.forEach((participant, index) => {
      participant.rankPosition = index + 1;
    });

    // Distribute prizes (top 3)
    const prizeDistribution = [0.5, 0.3, 0.2]; // 50%, 30%, 20%
    for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
      const participant = leaderboard[i];
      const prize = Number(tournament.prizePool) * prizeDistribution[i];

      participant.prizeWon = prize;

      if (prize > 0) {
        await this.walletService.creditCoins({
          userId: participant.userId,
          amount: prize,
          type: TransactionType.COIN_EARN,
          description: `Tournament prize: ${tournament.name} (Rank ${i + 1})`,
          metadata: {
            tournamentId,
            rank: i + 1,
          },
        });
      }

      participant.isPrizeClaimed = true;
    }

    await this.participantRepository.save(leaderboard);

    // Settle all bets
    await this.settleTournamentBets(tournamentId, leaderboard);

    // Update tournament status
    tournament.status = TournamentStatus.COMPLETED;
    await this.tournamentRepository.save(tournament);

    this.logger.log(`Tournament ${tournamentId} completed and prizes distributed`);
  }

  /**
   * Auto-update tournament statuses
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateTournamentStatuses() {
    const now = new Date();

    // Open registration
    await this.tournamentRepository.update(
      {
        status: TournamentStatus.UPCOMING,
        registrationOpensAt: LessThan(now),
      },
      { status: TournamentStatus.REGISTRATION_OPEN },
    );

    // Start tournaments
    await this.tournamentRepository.update(
      {
        status: TournamentStatus.REGISTRATION_OPEN,
        startsAt: LessThan(now),
      },
      { status: TournamentStatus.IN_PROGRESS },
    );

    // Complete tournaments
    const expiredTournaments = await this.tournamentRepository.find({
      where: {
        status: TournamentStatus.IN_PROGRESS,
        endsAt: LessThan(now),
      },
    });

    for (const tournament of expiredTournaments) {
      try {
        await this.completeTournament(tournament.id);
      } catch (error) {
        this.logger.error(`Error completing tournament ${tournament.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Private: Validate bet prediction
   */
  private validateBetPrediction(type: BetType, prediction: any): void {
    switch (type) {
      case BetType.WINNER:
      case BetType.TOP_SCORER:
        if (!prediction.userId) {
          throw new BadRequestException('userId is required for this bet type');
        }
        break;
      case BetType.CATEGORY_DOMINANCE:
        if (!prediction.categoryId) {
          throw new BadRequestException('categoryId is required for this bet type');
        }
        break;
      case BetType.ACCURACY_THRESHOLD:
        if (!prediction.threshold) {
          throw new BadRequestException('threshold is required for this bet type');
        }
        break;
    }
  }

  /**
   * Private: Calculate potential payout
   */
  private async calculatePotentialPayout(dto: PlaceBetDto): Promise<number> {
    // Get similar bets to calculate odds
    const similarBets = await this.betRepository.count({
      where: {
        tournamentId: dto.tournamentId,
        type: dto.type,
      },
    });

    // Simple odds: fewer bets = higher payout potential
    const baseMultiplier = 1.5;
    const bonusMultiplier = Math.max(1, 5 - similarBets * 0.1);

    return dto.stakeAmount * baseMultiplier * bonusMultiplier;
  }

  /**
   * Private: Settle all bets for a tournament
   */
  private async settleTournamentBets(
    tournamentId: string,
    leaderboard: TournamentParticipant[],
  ): Promise<void> {
    const bets = await this.betRepository.find({
      where: { tournamentId, status: BetStatus.PENDING },
    });

    for (const bet of bets) {
      let isWon = false;

      switch (bet.type) {
        case BetType.WINNER:
          isWon = leaderboard[0]?.userId === bet.prediction.userId;
          bet.result = {
            actualValue: leaderboard[0]?.userId || 'none',
            isCorrect: isWon,
          };
          break;

        case BetType.TOP_SCORER:
          // Top scorer in user's referral circle
          const topScorer = leaderboard.find((p) => p.userId === bet.prediction.userId);
          isWon = !!topScorer && (topScorer.rankPosition || 0) <= 3;
          bet.result = {
            actualValue: topScorer?.rankPosition || 0,
            isCorrect: isWon,
          };
          break;

        // Add more bet type resolutions as needed
      }

      bet.status = isWon ? BetStatus.WON : BetStatus.LOST;

      if (isWon && !bet.isPaid) {
        await this.walletService.creditCoins({
          userId: bet.userId,
          amount: bet.potentialPayout,
          type: TransactionType.COIN_EARN,
          description: `Bet winnings: Tournament ${tournamentId}`,
          metadata: { betId: bet.id },
        });

        bet.actualPayout = bet.potentialPayout;
        bet.isPaid = true;
      }

      await this.betRepository.save(bet);
    }

    this.logger.log(`Settled ${bets.length} bets for tournament ${tournamentId}`);
  }
}
