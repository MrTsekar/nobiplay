import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IpBlock } from '../entity/ip-block.entity';
import { SecurityLog, SecurityEventType, SeverityLevel } from '../entity/security-log.entity';
import { FraudAlert, FraudAlertType, AlertStatus } from '../entity/fraud-alert.entity';
import { UserSession } from '../entity/user-session.entity';
import { Transaction } from '../../wallet/entity/transaction.entity';
import {
  BlockIpDto,
  UnblockIpDto,
  LogSecurityEventDto,
  CreateFraudAlertDto,
  UpdateFraudAlertDto,
  GetSecurityLogsQueryDto,
  GetFraudAlertsQueryDto,
  CreateSessionDto,
} from '../dto/security.dto';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(IpBlock)
    private ipBlockRepository: Repository<IpBlock>,
    @InjectRepository(SecurityLog)
    private securityLogRepository: Repository<SecurityLog>,
    @InjectRepository(FraudAlert)
    private fraudAlertRepository: Repository<FraudAlert>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  // ============= IP BLOCKING =============
  async blockIp(dto: BlockIpDto, blockedBy: string): Promise<IpBlock> {
    const existing = await this.ipBlockRepository.findOne({
      where: { ipAddress: dto.ipAddress, isActive: true },
    });

    if (existing) {
      throw new BadRequestException('IP already blocked');
    }

    const block = this.ipBlockRepository.create({
      ...dto,
      blockedBy,
    });

    await this.ipBlockRepository.save(block);

    await this.logSecurityEvent({
      ipAddress: dto.ipAddress,
      eventType: SecurityEventType.IP_BLOCKED,
      severity: SeverityLevel.HIGH,
      description: `IP blocked: ${dto.reason} by ${blockedBy}`,
    });

    this.logger.log(`IP blocked: ${dto.ipAddress} by ${blockedBy}`);
    return block;
  }

  async unblockIp(dto: UnblockIpDto): Promise<void> {
    const block = await this.ipBlockRepository.findOne({
      where: { ipAddress: dto.ipAddress, isActive: true },
    });

    if (!block) {
      throw new NotFoundException('IP block not found');
    }

    block.isActive = false;
    await this.ipBlockRepository.save(block);

    this.logger.log(`IP unblocked: ${dto.ipAddress}`);
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const block = await this.ipBlockRepository.findOne({
      where: { ipAddress, isActive: true },
    });

    if (!block) {
      return false;
    }

    // Check expiration
    if (block.expiresAt && new Date() > block.expiresAt) {
      block.isActive = false;
      await this.ipBlockRepository.save(block);
      return false;
    }

    return true;
  }

  async getBlockedIps(limit: number = 50): Promise<IpBlock[]> {
    return await this.ipBlockRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============= SECURITY LOGGING =============
  async logSecurityEvent(dto: LogSecurityEventDto): Promise<SecurityLog> {
    const log = this.securityLogRepository.create(dto);
    await this.securityLogRepository.save(log);

    if (dto.severity === SeverityLevel.CRITICAL || dto.flaggedForReview) {
      this.logger.warn(
        `Security event flagged: ${dto.eventType} - ${dto.description}`,
      );
    }

    return log;
  }

  async getSecurityLogs(
    query: GetSecurityLogsQueryDto,
  ): Promise<{ data: SecurityLog[]; total: number }> {
    const queryBuilder = this.securityLogRepository
      .createQueryBuilder('log')
      .skip(query.offset)
      .take(query.limit)
      .orderBy('log.createdAt', 'DESC');

    if (query.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: query.userId });
    }

    if (query.ipAddress) {
      queryBuilder.andWhere('log.ipAddress = :ipAddress', {
        ipAddress: query.ipAddress,
      });
    }

    if (query.eventType) {
      queryBuilder.andWhere('log.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    if (query.severity) {
      queryBuilder.andWhere('log.severity = :severity', {
        severity: query.severity,
      });
    }

    if (query.flaggedForReview !== undefined) {
      queryBuilder.andWhere('log.flaggedForReview = :flaggedForReview', {
        flaggedForReview: query.flaggedForReview,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  // ============= FRAUD DETECTION =============
  async createFraudAlert(dto: CreateFraudAlertDto): Promise<FraudAlert> {
    const alert = this.fraudAlertRepository.create(dto);
    await this.fraudAlertRepository.save(alert);

    await this.logSecurityEvent({
      userId: dto.userId,
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: dto.riskScore > 75 ? SeverityLevel.CRITICAL : SeverityLevel.HIGH,
      description: `Fraud alert: ${dto.alertType} - ${dto.description}`,
      flaggedForReview: true,
    });

    this.logger.warn(`Fraud alert created for user ${dto.userId}: ${dto.alertType}`);
    return alert;
  }

  async getFraudAlerts(
    query: GetFraudAlertsQueryDto,
  ): Promise<{ data: FraudAlert[]; total: number }> {
    const queryBuilder = this.fraudAlertRepository
      .createQueryBuilder('alert')
      .skip(query.offset)
      .take(query.limit)
      .orderBy('alert.createdAt', 'DESC');

    if (query.userId) {
      queryBuilder.andWhere('alert.userId = :userId', { userId: query.userId });
    }

    if (query.alertType) {
      queryBuilder.andWhere('alert.alertType = :alertType', {
        alertType: query.alertType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('alert.status = :status', { status: query.status });
    }

    if (query.minRiskScore) {
      queryBuilder.andWhere('alert.riskScore >= :minRiskScore', {
        minRiskScore: query.minRiskScore,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async updateFraudAlert(
    alertId: number,
    dto: UpdateFraudAlertDto,
    reviewedBy: string,
  ): Promise<FraudAlert> {
    const alert = await this.fraudAlertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Fraud alert not found');
    }

    Object.assign(alert, dto);
    alert.reviewedBy = reviewedBy;
    alert.reviewedAt = new Date();

    await this.fraudAlertRepository.save(alert);

    this.logger.log(`Fraud alert ${alertId} updated by ${reviewedBy}`);
    return alert;
  }

  async detectRapidTransactions(userId: number): Promise<FraudAlert | null> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const transactions = await this.transactionRepository.count({
      where: {
        wallet: { userId } as any,
        createdAt: MoreThan(fiveMinutesAgo),
      },
    });

    if (transactions > 10) {
      return await this.createFraudAlert({
        userId,
        alertType: FraudAlertType.RAPID_TRANSACTIONS,
        riskScore: Math.min(50 + transactions * 5, 100),
        description: `${transactions} transactions in 5 minutes`,
        evidence: {
          transactionIds: [],
          timeframe: '5 minutes',
          patterns: [`${transactions} transactions`],
        },
      });
    }

    return null;
  }

  // ============= SESSION MANAGEMENT =============
  async createSession(dto: CreateSessionDto): Promise<UserSession> {
    const session = this.userSessionRepository.create(dto);
    await this.userSessionRepository.save(session);

    await this.logSecurityEvent({
      userId: dto.userId,
      ipAddress: dto.ipAddress,
      eventType: SecurityEventType.LOGIN_SUCCESS,
      severity: SeverityLevel.LOW,
      description: 'User logged in',
      metadata: {
        userAgent: dto.userAgent,
        fingerprintId: dto.deviceFingerprint,
      },
    });

    return session;
  }

  async getUserSessions(userId: number): Promise<UserSession[]> {
    return await this.userSessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  async revokeSession(sessionId: number): Promise<void> {
    const session = await this.userSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isActive = false;
    await this.userSessionRepository.save(session);

    this.logger.log(`Session ${sessionId} revoked for user ${session.userId}`);
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    await this.userSessionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const result = await this.userSessionRepository.update(
      {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
      { isActive: false },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired sessions`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireIpBlocks(): Promise<void> {
    const result = await this.ipBlockRepository.update(
      {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
      { isActive: false },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} IP blocks`);
    }
  }
}
