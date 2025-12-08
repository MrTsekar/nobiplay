import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Wallet } from '../entity/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entity/transaction.entity';
import {
  CreditCoinsDto,
  DebitCoinsDto,
  TopUpCashDto,
  RedeemAirtimeDto,
  RedeemDataDto,
  WithdrawCashDto,
  LinkCryptoWalletDto,
  RedeemCryptoDto,
  GetTransactionsDto,
  PurchaseCoinsDto,
} from '../dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new wallet for user during registration
   */
  async createWallet(userId: string): Promise<Wallet> {
    const existingWallet = await this.walletRepository.findOne({ where: { userId } });
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists for this user');
    }

    const wallet = this.walletRepository.create({
      userId,
      coinBalance: 0,
      cashBalance: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      totalCashEarned: 0,
      totalCashWithdrawn: 0,
    });

    return await this.walletRepository.save(wallet);
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string) {
    const wallet = await this.getWalletByUserId(userId);
    return {
      coinBalance: Number(wallet.coinBalance),
      cashBalance: Number(wallet.cashBalance),
      cryptoWalletAddress: wallet.cryptoWalletAddress,
      totalCoinsEarned: Number(wallet.totalCoinsEarned),
      totalCoinsSpent: Number(wallet.totalCoinsSpent),
      totalCashEarned: Number(wallet.totalCashEarned),
      totalCashWithdrawn: Number(wallet.totalCashWithdrawn),
      lastCryptoWithdrawal: wallet.lastCryptoWithdrawal,
    };
  }

  /**
   * Credit coins to wallet (ACID-compliant transaction)
   */
  async creditCoins(dto: CreditCoinsDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.coinBalance);
      const balanceAfter = balanceBefore + dto.amount;

      // Update wallet balance
      wallet.coinBalance = balanceAfter;
      wallet.totalCoinsEarned = Number(wallet.totalCoinsEarned) + dto.amount;
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: dto.type,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: dto.description || `Credited ${dto.amount} coins`,
        metadata: dto.metadata,
        reference: this.generateReference(),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      this.logger.log(`Credited ${dto.amount} coins to wallet ${wallet.id}`);
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to credit coins: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Debit coins from wallet (ACID-compliant transaction)
   */
  async debitCoins(dto: DebitCoinsDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.coinBalance);

      if (balanceBefore < dto.amount) {
        throw new BadRequestException('Insufficient coin balance');
      }

      const balanceAfter = balanceBefore - dto.amount;

      // Update wallet balance
      wallet.coinBalance = balanceAfter;
      wallet.totalCoinsSpent = Number(wallet.totalCoinsSpent) + dto.amount;
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: dto.type,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: dto.description || `Debited ${dto.amount} coins`,
        metadata: dto.metadata,
        reference: this.generateReference(),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      this.logger.log(`Debited ${dto.amount} coins from wallet ${wallet.id}`);
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to debit coins: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Top up cash balance
   */
  async topUpCash(userId: string, dto: TopUpCashDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.cashBalance);
      const balanceAfter = balanceBefore + dto.amount;

      // Update wallet balance
      wallet.cashBalance = balanceAfter;
      wallet.totalCashEarned = Number(wallet.totalCashEarned) + dto.amount;
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.CASH_DEPOSIT,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: `Cash top-up via ${dto.paymentMethod}`,
        metadata: { paymentMethod: dto.paymentMethod },
        reference: this.generateReference(),
        externalReference: dto.paymentReference,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      this.logger.log(`Topped up ${dto.amount} cash to wallet ${wallet.id}`);
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to top up cash: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Redeem airtime
   */
  async redeemAirtime(userId: string, dto: RedeemAirtimeDto): Promise<Transaction> {
    const wallet = await this.getWalletByUserId(userId);

    if (Number(wallet.coinBalance) < dto.amount) {
      throw new BadRequestException('Insufficient coin balance');
    }

    // TODO: Integrate with VTU API (e.g., VAS2Nets, MTech)
    // For now, we'll create a pending transaction
    const transaction = await this.debitCoins({
      userId,
      amount: dto.amount,
      type: TransactionType.AIRTIME_REDEEM,
      description: `Airtime redemption for ${dto.phoneNumber} (${dto.network})`,
      metadata: {
        phoneNumber: dto.phoneNumber,
        network: dto.network,
        airtimeAmount: dto.amount,
      },
    });

    this.logger.log(`Airtime redemption initiated: ${dto.amount} to ${dto.phoneNumber}`);
    return transaction;
  }

  /**
   * Redeem data bundle
   */
  async redeemData(userId: string, dto: RedeemDataDto): Promise<Transaction> {
    const wallet = await this.getWalletByUserId(userId);

    if (Number(wallet.coinBalance) < dto.amount) {
      throw new BadRequestException('Insufficient coin balance');
    }

    // TODO: Integrate with VTU API
    const transaction = await this.debitCoins({
      userId,
      amount: dto.amount,
      type: TransactionType.DATA_REDEEM,
      description: `Data redemption for ${dto.phoneNumber} (${dto.network})`,
      metadata: {
        phoneNumber: dto.phoneNumber,
        network: dto.network,
        dataBundle: dto.dataBundle,
      },
    });

    this.logger.log(`Data redemption initiated: ${dto.dataBundle} to ${dto.phoneNumber}`);
    return transaction;
  }

  /**
   * Withdraw cash to bank account
   */
  async withdrawCash(userId: string, dto: WithdrawCashDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.cashBalance);

      if (balanceBefore < dto.amount) {
        throw new BadRequestException('Insufficient cash balance');
      }

      const balanceAfter = balanceBefore - dto.amount;

      // Update wallet balance
      wallet.cashBalance = balanceAfter;
      wallet.totalCashWithdrawn = Number(wallet.totalCashWithdrawn) + dto.amount;
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.CASH_WITHDRAW,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.PENDING, // Will be updated after payment provider confirms
        description: `Cash withdrawal to ${dto.bankAccount}`,
        metadata: {
          bankAccount: dto.bankAccount,
          bankCode: dto.bankCode,
        },
        reference: this.generateReference(),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      // TODO: Integrate with Paystack/Monnify for bank transfer
      this.logger.log(`Cash withdrawal initiated: ${dto.amount} to ${dto.bankAccount}`);
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to withdraw cash: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Link crypto wallet address
   */
  async linkCryptoWallet(userId: string, dto: LinkCryptoWalletDto): Promise<Wallet> {
    const wallet = await this.getWalletByUserId(userId);

    // Basic validation for wallet address format
    if (!this.isValidWalletAddress(dto.walletAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    wallet.cryptoWalletAddress = dto.walletAddress;
    await this.walletRepository.save(wallet);

    this.logger.log(`Crypto wallet linked for user ${userId}: ${dto.walletAddress}`);
    return wallet;
  }

  /**
   * Redeem coins for crypto (USDT payout)
   * Rate limiting: 1 withdrawal per user per day
   */
  async redeemCrypto(userId: string, dto: RedeemCryptoDto): Promise<Transaction> {
    const wallet = await this.getWalletByUserId(userId);

    // Check if crypto wallet is linked
    if (!wallet.cryptoWalletAddress) {
      throw new BadRequestException('Please link your crypto wallet first');
    }

    // Check rate limiting (1 per day)
    if (wallet.lastCryptoWithdrawal) {
      const hoursSinceLastWithdrawal =
        (new Date().getTime() - new Date(wallet.lastCryptoWithdrawal).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastWithdrawal < 24) {
        throw new BadRequestException('You can only make one crypto withdrawal per day');
      }
    }

    // Check sufficient balance
    if (Number(wallet.coinBalance) < dto.coinAmount) {
      throw new BadRequestException('Insufficient coin balance');
    }

    // Debit coins and create transaction
    const transaction = await this.debitCoins({
      userId,
      amount: dto.coinAmount,
      type: TransactionType.CRYPTO_WITHDRAW,
      description: `Crypto withdrawal: ${dto.coinAmount} coins to ${dto.cryptoType}`,
      metadata: {
        cryptoType: dto.cryptoType,
        walletAddress: wallet.cryptoWalletAddress,
        conversionRate: 1, // TODO: Implement dynamic conversion rate
      },
    });

    // Update last crypto withdrawal timestamp
    wallet.lastCryptoWithdrawal = new Date();
    await this.walletRepository.save(wallet);

    // TODO: Queue crypto payout via Redis + BullMQ
    // TODO: Integrate with crypto payment provider (secured via AWS KMS)
    this.logger.log(`Crypto withdrawal queued: ${dto.coinAmount} coins to ${wallet.cryptoWalletAddress}`);

    return transaction;
  }

  /**
   * Purchase coins with cash/airtime
   */
  async purchaseCoins(userId: string, dto: PurchaseCoinsDto): Promise<Transaction> {
    // TODO: Integrate with payment provider to verify payment
    // For now, we'll create a pending transaction

    const transaction = await this.creditCoins({
      userId,
      amount: dto.amount,
      type: TransactionType.COIN_PURCHASE,
      description: `Coin purchase via ${dto.paymentMethod}`,
      metadata: {
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
      },
    });

    this.logger.log(`Coin purchase: ${dto.amount} coins via ${dto.paymentMethod}`);
    return transaction;
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, dto: GetTransactionsDto) {
    const wallet = await this.getWalletByUserId(userId);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .orderBy('transaction.createdAt', 'DESC');

    // Filter by transaction type
    if (dto.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: dto.type });
    }

    // Filter by date range
    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      });
    } else if (dto.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    } else if (dto.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    // Pagination
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        status: t.status,
        description: t.description,
        metadata: t.metadata,
        reference: t.reference,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string) {
    const wallet = await this.getWalletByUserId(userId);

    const [totalTransactions, recentTransactions] = await Promise.all([
      this.transactionRepository.count({ where: { walletId: wallet.id } }),
      this.transactionRepository.find({
        where: { walletId: wallet.id },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      balances: {
        coinBalance: Number(wallet.coinBalance),
        cashBalance: Number(wallet.cashBalance),
      },
      totals: {
        coinsEarned: Number(wallet.totalCoinsEarned),
        coinsSpent: Number(wallet.totalCoinsSpent),
        cashEarned: Number(wallet.totalCashEarned),
        cashWithdrawn: Number(wallet.totalCashWithdrawn),
      },
      transactionCount: totalTransactions,
      recentTransactions: recentTransactions.map((t) => ({
        type: t.type,
        amount: Number(t.amount),
        status: t.status,
        createdAt: t.createdAt,
      })),
      cryptoWallet: {
        isLinked: !!wallet.cryptoWalletAddress,
        address: wallet.cryptoWalletAddress,
        lastWithdrawal: wallet.lastCryptoWithdrawal,
        canWithdraw: !wallet.lastCryptoWithdrawal ||
          (new Date().getTime() - new Date(wallet.lastCryptoWithdrawal).getTime()) / (1000 * 60 * 60) >= 24,
      },
    };
  }

  /**
   * Generate unique transaction reference
   */
  private generateReference(): string {
    return `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  /**
   * Validate crypto wallet address format
   */
  private isValidWalletAddress(address: string): boolean {
    // Basic validation - starts with 0x for Ethereum-based or proper format for others
    return /^(0x)?[0-9a-fA-F]{40}$/.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  }
}
