import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MarketplaceItem,
  ItemType,
} from '../entity/marketplace-item.entity';
import {
  Redemption,
  RedemptionStatus,
} from '../entity/redemption.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(MarketplaceItem)
    private readonly itemRepository: Repository<MarketplaceItem>,
    @InjectRepository(Redemption)
    private readonly redemptionRepository: Repository<Redemption>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Get all marketplace items
   */
  async getMarketplaceItems(filters?: {
    type?: ItemType;
    isFeatured?: boolean;
  }): Promise<MarketplaceItem[]> {
    const query = this.itemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true });

    if (filters?.type) {
      query.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters?.isFeatured !== undefined) {
      query.andWhere('item.isFeatured = :isFeatured', {
        isFeatured: filters.isFeatured,
      });
    }

    // Filter out expired limited items
    query.andWhere(
      '(item.expiresAt IS NULL OR item.expiresAt > :now)',
      { now: new Date() },
    );

    // Filter out out-of-stock items
    query.andWhere(
      '(item.isLimited = false OR (item.isLimited = true AND item.stockQuantity > 0))',
    );

    return await query.orderBy('item.displayOrder', 'ASC').getMany();
  }

  /**
   * Get marketplace item details
   */
  async getItemDetails(itemId: string): Promise<MarketplaceItem> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Marketplace item not found');
    }

    return item;
  }

  /**
   * Redeem marketplace item
   */
  async redeemItem(
    userId: string,
    itemId: string,
    details?: {
      recipientPhone?: string;
      recipientEmail?: string;
      bankAccount?: string;
      cryptoAddress?: string;
    },
  ): Promise<Redemption> {
    const item = await this.getItemDetails(itemId);

    if (!item.isActive) {
      throw new BadRequestException('Item is not available');
    }

    // Check stock for limited items
    if (item.isLimited) {
      if (!item.stockQuantity || item.stockQuantity <= 0) {
        throw new BadRequestException('Item is out of stock');
      }
    }

    // Check expiry
    if (item.expiresAt && new Date() > item.expiresAt) {
      throw new BadRequestException('Item has expired');
    }

    // Debit coins
    await this.walletService.debitCoins({
      userId,
      amount: item.coinPrice,
      type: TransactionType.COIN_SPEND,
      description: `Marketplace redemption: ${item.name}`,
      metadata: { itemId },
    });

    // Create redemption
    const redemption = this.redemptionRepository.create({
      userId,
      itemId,
      coinCost: item.coinPrice,
      cashValue: item.cashValue,
      transactionReference: this.generateTransactionRef(),
      recipientPhone: details?.recipientPhone,
      recipientEmail: details?.recipientEmail,
      bankAccount: details?.bankAccount,
      cryptoAddress: details?.cryptoAddress,
    });

    await this.redemptionRepository.save(redemption);

    // Update item stock
    if (item.isLimited && item.stockQuantity) {
      item.stockQuantity -= 1;
    }
    item.totalRedeemed += 1;
    await this.itemRepository.save(item);

    // Process redemption based on type
    await this.processRedemption(redemption, item);

    this.logger.log(
      `User ${userId} redeemed ${item.type}: ${item.name}`,
    );

    return redemption;
  }

  /**
   * Get user's redemption history
   */
  async getUserRedemptions(
    userId: string,
    limit = 20,
  ): Promise<Redemption[]> {
    return await this.redemptionRepository.find({
      where: { userId },
      relations: ['item'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get redemption details
   */
  async getRedemptionDetails(
    userId: string,
    redemptionId: string,
  ): Promise<Redemption> {
    const redemption = await this.redemptionRepository.findOne({
      where: { id: redemptionId, userId },
      relations: ['item'],
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    return redemption;
  }

  /**
   * Create marketplace item (admin only)
   */
  async createItem(dto: {
    name: string;
    description?: string;
    type: ItemType;
    coinPrice: number;
    cashValue?: number;
    stockQuantity?: number;
    isLimited?: boolean;
    isFeatured?: boolean;
    icon?: string;
    displayOrder?: number;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }): Promise<MarketplaceItem> {
    const existing = await this.itemRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        'Item with this name already exists',
      );
    }

    const item = this.itemRepository.create(dto);
    return await this.itemRepository.save(item);
  }

  /**
   * Update marketplace item (admin only)
   */
  async updateItem(
    itemId: string,
    updates: Partial<MarketplaceItem>,
  ): Promise<MarketplaceItem> {
    const item = await this.getItemDetails(itemId);

    Object.assign(item, updates);
    return await this.itemRepository.save(item);
  }

  /**
   * Process pending redemptions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingRedemptions() {
    try {
      const pendingRedemptions = await this.redemptionRepository.find({
        where: { status: RedemptionStatus.PENDING },
        relations: ['item'],
        take: 50,
      });

      for (const redemption of pendingRedemptions) {
        try {
          await this.processRedemption(redemption, redemption.item);
        } catch (error) {
          this.logger.error(
            `Error processing redemption ${redemption.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      // Silently fail if tables don't exist yet
    }
  }

  /**
   * Deactivate expired items
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredItems() {
    try {
      const now = new Date();

      await this.itemRepository.update(
        {
          isActive: true,
          expiresAt: new Date(now.getTime() - 1),
        },
        {
          isActive: false,
        },
      );

      this.logger.log('Expired marketplace items deactivated');
    } catch (error) {
      // Silently fail if tables don't exist yet
    }
  }

  /**
   * Private: Process redemption based on item type
   */
  private async processRedemption(
    redemption: Redemption,
    item: MarketplaceItem,
  ): Promise<void> {
    redemption.status = RedemptionStatus.PROCESSING;
    await this.redemptionRepository.save(redemption);

    try {
      switch (item.type) {
        case ItemType.AIRTIME:
          await this.processAirtimeRedemption(redemption);
          break;

        case ItemType.DATA:
          await this.processDataRedemption(redemption);
          break;

        case ItemType.CASH_WITHDRAWAL:
          await this.processCashWithdrawal(redemption);
          break;

        case ItemType.CRYPTO:
          await this.processCryptoRedemption(redemption);
          break;

        case ItemType.TOURNAMENT_PASS:
          await this.processTournamentPass(redemption);
          break;

        case ItemType.VOUCHER:
          await this.processVoucherRedemption(redemption);
          break;

        case ItemType.THEMED_PACK:
          await this.processThemedPackRedemption(redemption);
          break;
      }

      redemption.status = RedemptionStatus.COMPLETED;
      redemption.processedAt = new Date();
      await this.redemptionRepository.save(redemption);

      this.logger.log(
        `Redemption ${redemption.id} completed successfully`,
      );
    } catch (error) {
      redemption.status = RedemptionStatus.FAILED;
      redemption.failedReason = error instanceof Error ? error.message : String(error);
      await this.redemptionRepository.save(redemption);

      // Refund coins
      await this.refundRedemption(redemption);

      this.logger.error(
        `Redemption ${redemption.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Private: Process airtime redemption
   */
  private async processAirtimeRedemption(
    redemption: Redemption,
  ): Promise<void> {
    // TODO: Integrate with VAS API for airtime top-up
    // For now, simulate success
    redemption.externalReference = `AIRTIME-${Date.now()}`;
    this.logger.log(
      `Airtime redemption processed: ${redemption.recipientPhone}`,
    );
  }

  /**
   * Private: Process data redemption
   */
  private async processDataRedemption(
    redemption: Redemption,
  ): Promise<void> {
    // TODO: Integrate with VAS API for data bundle
    redemption.externalReference = `DATA-${Date.now()}`;
    this.logger.log(
      `Data redemption processed: ${redemption.recipientPhone}`,
    );
  }

  /**
   * Private: Process cash withdrawal
   */
  private async processCashWithdrawal(
    redemption: Redemption,
  ): Promise<void> {
    if (!redemption.bankAccount) {
      throw new BadRequestException('Bank account required');
    }

    // TODO: Integrate with Paystack/Monnify for withdrawal
    redemption.externalReference = `CASH-${Date.now()}`;
    this.logger.log(
      `Cash withdrawal processed: ${redemption.bankAccount}`,
    );
  }

  /**
   * Private: Process crypto redemption
   */
  private async processCryptoRedemption(
    redemption: Redemption,
  ): Promise<void> {
    if (!redemption.cryptoAddress) {
      throw new BadRequestException('Crypto address required');
    }

    // TODO: Integrate with crypto wallet service
    redemption.externalReference = `CRYPTO-${Date.now()}`;
    this.logger.log(
      `Crypto redemption processed: ${redemption.cryptoAddress}`,
    );
  }

  /**
   * Private: Process tournament pass
   */
  private async processTournamentPass(
    redemption: Redemption,
  ): Promise<void> {
    // Tournament pass is instant - just mark as completed
    redemption.externalReference = `TPASS-${Date.now()}`;
    this.logger.log(
      `Tournament pass issued to user ${redemption.userId}`,
    );
  }

  /**
   * Private: Process voucher redemption
   */
  private async processVoucherRedemption(
    redemption: Redemption,
  ): Promise<void> {
    // Generate voucher code
    const voucherCode = this.generateVoucherCode();
    redemption.externalReference = voucherCode;
    redemption.notes = `Voucher code: ${voucherCode}`;
    this.logger.log(`Voucher issued: ${voucherCode}`);
  }

  /**
   * Private: Process themed pack redemption
   */
  private async processThemedPackRedemption(
    redemption: Redemption,
  ): Promise<void> {
    // Themed pack is instant access - just mark as completed
    redemption.externalReference = `PACK-${Date.now()}`;
    this.logger.log(
      `Themed pack unlocked for user ${redemption.userId}`,
    );
  }

  /**
   * Private: Refund failed redemption
   */
  private async refundRedemption(redemption: Redemption): Promise<void> {
    await this.walletService.creditCoins({
      userId: redemption.userId,
      amount: redemption.coinCost,
      type: TransactionType.REFUND,
      description: `Redemption refund: ${redemption.transactionReference}`,
      metadata: { redemptionId: redemption.id },
    });

    redemption.status = RedemptionStatus.REFUNDED;
    await this.redemptionRepository.save(redemption);

    this.logger.log(`Redemption ${redemption.id} refunded`);
  }

  /**
   * Private: Generate transaction reference
   */
  private generateTransactionRef(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Private: Generate voucher code
   */
  private generateVoucherCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if ((i + 1) % 4 === 0 && i < 11) code += '-';
    }
    return code;
  }
}
