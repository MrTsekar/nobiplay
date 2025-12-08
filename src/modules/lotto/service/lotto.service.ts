import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LottoDraw, DrawStatus, DrawFrequency } from '../entity/lotto-draw.entity';
import { LottoEntry } from '../entity/lotto-entry.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { randomBytes } from 'crypto';

export interface CreateLottoDrawDto {
  name: string;
  frequency: DrawFrequency;
  entryCost: number;
  maxEntriesPerUser?: number;
  drawTime: Date;
  closesAt: Date;
}

export interface EnterLottoDto {
  drawId: string;
  numberOfEntries: number;
}

@Injectable()
export class LottoService {
  private readonly logger = new Logger(LottoService.name);

  constructor(
    @InjectRepository(LottoDraw)
    private readonly drawRepository: Repository<LottoDraw>,
    @InjectRepository(LottoEntry)
    private readonly entryRepository: Repository<LottoEntry>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a new lotto draw (admin only)
   */
  async createDraw(dto: CreateLottoDrawDto): Promise<LottoDraw> {
    const existing = await this.drawRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Lotto draw with this name already exists');
    }

    const draw = this.drawRepository.create({
      ...dto,
      maxEntriesPerUser: dto.maxEntriesPerUser || 10,
    });

    return await this.drawRepository.save(draw);
  }

  /**
   * Get all active lotto draws
   */
  async getActiveDraws(): Promise<LottoDraw[]> {
    return await this.drawRepository.find({
      where: { status: DrawStatus.OPEN },
      order: { drawTime: 'ASC' },
    });
  }

  /**
   * Get lotto draw details
   */
  async getDrawDetails(drawId: string): Promise<LottoDraw> {
    const draw = await this.drawRepository.findOne({
      where: { id: drawId },
    });

    if (!draw) {
      throw new NotFoundException('Lotto draw not found');
    }

    return draw;
  }

  /**
   * Enter the lotto
   */
  async enterLotto(userId: string, dto: EnterLottoDto): Promise<LottoEntry[]> {
    const draw = await this.drawRepository.findOne({
      where: { id: dto.drawId },
    });

    if (!draw) {
      throw new NotFoundException('Lotto draw not found');
    }

    if (draw.status !== DrawStatus.OPEN) {
      throw new BadRequestException('Lotto draw is not open for entries');
    }

    if (new Date() >= draw.closesAt) {
      throw new BadRequestException('Lotto draw has closed');
    }

    // Check user's existing entries
    const userEntriesCount = await this.entryRepository.count({
      where: { drawId: dto.drawId, userId },
    });

    if (userEntriesCount + dto.numberOfEntries > draw.maxEntriesPerUser) {
      throw new BadRequestException(
        `Maximum ${draw.maxEntriesPerUser} entries per user allowed`,
      );
    }

    // Calculate total cost
    const totalCost = Number(draw.entryCost) * dto.numberOfEntries;

    // Debit coins
    await this.walletService.debitCoins({
      userId,
      amount: totalCost,
      type: TransactionType.COIN_SPEND,
      description: `Lotto entry: ${draw.name} (${dto.numberOfEntries} tickets)`,
      metadata: { drawId: dto.drawId, entries: dto.numberOfEntries },
    });

    // Add to prize pool
    draw.prizePool = Number(draw.prizePool) + totalCost;
    draw.totalEntries += dto.numberOfEntries;
    await this.drawRepository.save(draw);

    // Create entries
    const entries: LottoEntry[] = [];
    for (let i = 0; i < dto.numberOfEntries; i++) {
      const ticketNumber = this.generateTicketNumber();

      const entry = this.entryRepository.create({
        drawId: dto.drawId,
        userId,
        ticketNumber,
      });

      entries.push(entry);
    }

    const savedEntries = await this.entryRepository.save(entries);

    this.logger.log(`User ${userId} entered lotto ${dto.drawId} with ${dto.numberOfEntries} tickets`);

    return savedEntries;
  }

  /**
   * Get user's lotto entries
   */
  async getUserEntries(userId: string, drawId?: string): Promise<LottoEntry[]> {
    const query = this.entryRepository.createQueryBuilder('entry').where('entry.userId = :userId', {
      userId,
    });

    if (drawId) {
      query.andWhere('entry.drawId = :drawId', { drawId });
    }

    return await query
      .leftJoinAndSelect('entry.draw', 'draw')
      .orderBy('entry.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get recent winners
   */
  async getRecentWinners(limit = 10): Promise<LottoEntry[]> {
    return await this.entryRepository.find({
      where: { isWinner: true },
      relations: ['user', 'draw'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Conduct lotto draw
   */
  async conductDraw(drawId: string): Promise<{ winner: LottoEntry; draw: LottoDraw }> {
    const draw = await this.drawRepository.findOne({
      where: { id: drawId },
    });

    if (!draw) {
      throw new NotFoundException('Lotto draw not found');
    }

    if (draw.status !== DrawStatus.OPEN) {
      throw new BadRequestException('Lotto draw is not in open status');
    }

    // Update status to drawing
    draw.status = DrawStatus.DRAWING;
    await this.drawRepository.save(draw);

    // Get all entries
    const entries = await this.entryRepository.find({
      where: { drawId },
      relations: ['user'],
    });

    if (entries.length === 0) {
      draw.status = DrawStatus.CANCELLED;
      await this.drawRepository.save(draw);
      throw new BadRequestException('No entries for this draw');
    }

    // Select random winner
    const winnerIndex = Math.floor(Math.random() * entries.length);
    const winner = entries[winnerIndex];

    // Calculate prize (90% of prize pool, 10% platform fee)
    const prizeAmount = Number(draw.prizePool) * 0.9;

    // Update winner
    winner.isWinner = true;
    winner.prizeAmount = prizeAmount;
    await this.entryRepository.save(winner);

    // Credit prize to winner
    await this.walletService.creditCoins({
      userId: winner.userId,
      amount: prizeAmount,
      type: TransactionType.COIN_EARN,
      description: `Lotto win: ${draw.name}`,
      metadata: {
        drawId,
        ticketNumber: winner.ticketNumber,
      },
    });

    winner.isPrizeClaimed = true;
    await this.entryRepository.save(winner);

    // Update draw
    draw.status = DrawStatus.COMPLETED;
    draw.winnerUserId = winner.userId;
    draw.prizeAmount = prizeAmount;
    await this.drawRepository.save(draw);

    this.logger.log(`Lotto draw ${drawId} completed. Winner: ${winner.userId}`);

    return { winner, draw };
  }

  /**
   * Auto-conduct lotto draws (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoConductDraws() {
    const now = new Date();

    const pendingDraws = await this.drawRepository.find({
      where: {
        status: DrawStatus.OPEN,
        drawTime: LessThan(now),
      },
    });

    for (const draw of pendingDraws) {
      try {
        await this.conductDraw(draw.id);
      } catch (error) {
        this.logger.error(`Error conducting draw ${draw.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Create daily lotto draws (runs at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createDailyDraw() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0); // Draw at 8 PM

    const closesAt = new Date(tomorrow);
    closesAt.setHours(19, 30, 0, 0); // Close at 7:30 PM

    const name = `Daily Lotto - ${tomorrow.toISOString().split('T')[0]}`;

    await this.createDraw({
      name,
      frequency: DrawFrequency.DAILY,
      entryCost: 100,
      maxEntriesPerUser: 10,
      drawTime: tomorrow,
      closesAt,
    });

    this.logger.log(`Created daily lotto draw: ${name}`);
  }

  /**
   * Create weekly lotto draws (runs every Monday at midnight)
   */
  @Cron(CronExpression.EVERY_WEEK)
  async createWeeklyDraw() {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(20, 0, 0, 0); // Draw at 8 PM Sunday

    const closesAt = new Date(nextSunday);
    closesAt.setHours(19, 30, 0, 0); // Close at 7:30 PM

    const name = `Weekly Jackpot - Week ${this.getWeekNumber(nextSunday)}`;

    await this.createDraw({
      name,
      frequency: DrawFrequency.WEEKLY,
      entryCost: 500,
      maxEntriesPerUser: 20,
      drawTime: nextSunday,
      closesAt,
    });

    this.logger.log(`Created weekly lotto draw: ${name}`);
  }

  /**
   * Private: Generate unique ticket number
   */
  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Private: Get week number of the year
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
