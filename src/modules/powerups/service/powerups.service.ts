import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Powerup, PowerupType } from '../entity/powerup.entity';
import { UserPowerup, PowerupStatus } from '../entity/user-powerup.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import {
  PurchasePowerupDto,
  UsePowerupDto,
  GetPowerupsDto,
  CreatePowerupDto,
} from '../dto';

@Injectable()
export class PowerupsService {
  private readonly logger = new Logger(PowerupsService.name);

  constructor(
    @InjectRepository(Powerup)
    private readonly powerupRepository: Repository<Powerup>,
    @InjectRepository(UserPowerup)
    private readonly userPowerupRepository: Repository<UserPowerup>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Get all available powerups
   */
  async getAllPowerups(): Promise<Powerup[]> {
    return await this.powerupRepository.find({
      where: { isActive: true },
      order: { rarity: 'ASC', coinPrice: 'ASC' },
    });
  }

  /**
   * Purchase powerup
   */
  async purchasePowerup(userId: string, dto: PurchasePowerupDto) {
    const powerup = await this.powerupRepository.findOne({
      where: { id: dto.powerupId },
    });

    if (!powerup) {
      throw new NotFoundException('Powerup not found');
    }

    if (!powerup.isActive) {
      throw new BadRequestException('Powerup is not available');
    }

    const totalCost = dto.paymentMethod === 'coins' 
      ? powerup.coinPrice * dto.quantity 
      : powerup.cashPrice * dto.quantity;

    // Debit payment
    if (dto.paymentMethod === 'coins') {
      await this.walletService.debitCoins({
        userId,
        amount: totalCost,
        type: TransactionType.COIN_SPEND,
        description: `Purchased ${dto.quantity}x ${powerup.name}`,
        metadata: { powerupId: powerup.id },
      });
    } else {
      // Cash payment - implement cash debit logic or use withdrawal
      await this.walletService.debitCoins({
        userId,
        amount: totalCost,
        type: TransactionType.COIN_SPEND,
        description: `Purchased ${dto.quantity}x ${powerup.name} (cash)`,
        metadata: { powerupId: powerup.id, paymentMethod: 'cash' },
      });
    }

    // Check if user already has this powerup
    let userPowerup = await this.userPowerupRepository.findOne({
      where: {
        userId,
        powerupId: powerup.id,
        status: PowerupStatus.AVAILABLE,
      },
    });

    if (userPowerup && powerup.isStackable) {
      // Stack powerup
      userPowerup.quantity += dto.quantity;
      await this.userPowerupRepository.save(userPowerup);
    } else {
      // Create new powerup inventory item
      userPowerup = this.userPowerupRepository.create({
        userId,
        powerupId: powerup.id,
        quantity: dto.quantity,
        status: PowerupStatus.AVAILABLE,
      });
      await this.userPowerupRepository.save(userPowerup);
    }

    this.logger.log(`User ${userId} purchased ${dto.quantity}x ${powerup.name}`);

    return {
      success: true,
      powerup: userPowerup,
    };
  }

  /**
   * Get user's powerup inventory
   */
  async getUserPowerups(userId: string, dto: GetPowerupsDto) {
    const { filter = 'available', page = 1, limit = 50 } = dto;

    const queryBuilder = this.userPowerupRepository
      .createQueryBuilder('up')
      .leftJoinAndSelect('up.powerup', 'powerup')
      .where('up.userId = :userId', { userId });

    if (filter === 'available') {
      queryBuilder.andWhere('up.status = :status AND up.quantity > 0', {
        status: PowerupStatus.AVAILABLE,
      });
    } else if (filter === 'used') {
      queryBuilder.andWhere('up.status = :status', { status: PowerupStatus.USED });
    }

    const [powerups, total] = await queryBuilder
      .orderBy('up.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: powerups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Use powerup
   */
  async usePowerup(userId: string, dto: UsePowerupDto) {
    const userPowerup = await this.userPowerupRepository.findOne({
      where: {
        id: dto.userPowerupId,
        userId,
      },
      relations: ['powerup'],
    });

    if (!userPowerup) {
      throw new NotFoundException('Powerup not found in inventory');
    }

    if (userPowerup.quantity <= 0) {
      throw new BadRequestException('No powerups remaining');
    }

    if (userPowerup.status !== PowerupStatus.AVAILABLE) {
      throw new BadRequestException('Powerup is not available');
    }

    // Decrease quantity
    userPowerup.quantity -= 1;
    userPowerup.usedCount += 1;
    userPowerup.lastUsedAt = new Date();

    if (userPowerup.quantity === 0) {
      userPowerup.status = PowerupStatus.USED;
    }

    await this.userPowerupRepository.save(userPowerup);

    this.logger.log(`User ${userId} used powerup ${userPowerup.powerup.name}`);

    return {
      success: true,
      powerup: userPowerup.powerup,
      remainingQuantity: userPowerup.quantity,
    };
  }

  /**
   * Create powerup (admin)
   */
  async createPowerup(dto: CreatePowerupDto): Promise<Powerup> {
    const powerup = this.powerupRepository.create(dto);
    return await this.powerupRepository.save(powerup);
  }

  /**
   * Expire powerups (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expirePowerups() {
    const now = new Date();

    const result = await this.userPowerupRepository.update(
      {
        status: PowerupStatus.AVAILABLE,
        expiresAt: LessThan(now),
      },
      {
        status: PowerupStatus.EXPIRED,
      },
    );

    this.logger.log(`Expired ${result.affected} powerups`);
  }

  /**
   * Get powerup usage statistics
   */
  async getPowerupStats(userId: string) {
    const [total, available, used] = await Promise.all([
      this.userPowerupRepository.count({ where: { userId } }),
      this.userPowerupRepository.count({
        where: { userId, status: PowerupStatus.AVAILABLE },
      }),
      this.userPowerupRepository.count({
        where: { userId, status: PowerupStatus.USED },
      }),
    ]);

    const totalUsed = await this.userPowerupRepository
      .createQueryBuilder('up')
      .select('SUM(up.usedCount)', 'total')
      .where('up.userId = :userId', { userId })
      .getRawOne();

    return {
      total,
      available,
      used,
      totalUsages: parseInt(totalUsed?.total || '0'),
    };
  }
}
