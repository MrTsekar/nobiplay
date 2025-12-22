import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as os from 'os';
import { CacheService } from '../../../common/services/cache.service';
import {
  AdminUser,
  AdminRole,
  AdminPermission,
  AdminAuditLog,
} from '../entity/admin.entity';
import { SupportTicket, TicketStatus } from '../entity/support-ticket.entity';
import { AdminStats, StatsType } from '../entity/admin-stats.entity';
import { User } from '../../user/entity/user.entity';
import { TriviaSession } from '../../trivia/entity/trivia-session.entity';
import { Transaction, TransactionType } from '../../wallet/entity/transaction.entity';
import {
  CreateAdminDto,
  UpdateAdminDto,
  AdminLoginDto,
  GetAdminsQueryDto,
  GetUsersQueryDto,
  UpdateUserStatusDto,
  CreateTriviaQuestionDto,
  UpdateTriviaQuestionDto,
  CreateMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  BulkDeleteDto,
  GetTriviaQuestionsQueryDto,
  GetMarketplaceItemsQueryDto,
  GetAnalyticsQueryDto,
  GetDashboardStatsDto,
  GetAuditLogsQueryDto,
  PlatformUser,
  TriviaQuestion,
  MarketplaceItem,
  RevenueAnalytics,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  GetSupportTicketsQueryDto,
  BanUserDto,
  AdjustBalanceDto,
  LiveStats,
  ActiveGame,
  RecentTransaction,
} from '../dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminAuditLog)
    private auditLogRepository: Repository<AdminAuditLog>,
    @InjectRepository(SupportTicket)
    private supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(AdminStats)
    private adminStatsRepository: Repository<AdminStats>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TriviaSession)
    private triviaSessionRepository: Repository<TriviaSession>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private jwtService: JwtService,
    private cacheService: CacheService,
  ) {}

  async createAdmin(dto: CreateAdminDto, createdBy: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
  }> {
    const existing = await this.adminUserRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Admin email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = this.adminUserRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.adminUserRepository.save(admin);

    // Log audit
    await this.logAudit(createdBy, 'CREATE_ADMIN', 'admin_users', admin.id, {
      email: admin.email,
      role: admin.role,
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }

  async adminLogin(dto: AdminLoginDto): Promise<{
    access_token: string;
    admin: { id: string; email: string; name: string; role: string };
  }> {
    const admin = await this.adminUserRepository.findOne({
      where: { email: dto.email },
    });

    if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new ForbiddenException('Admin account is inactive');
    }

    admin.lastLogin = new Date();
    await this.adminUserRepository.save(admin);

    const token = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    });

    return {
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async getAdmins(query: GetAdminsQueryDto): Promise<{
    data: AdminUser[];
    total: number;
  }> {
    const queryBuilder = this.adminUserRepository
      .createQueryBuilder('admin')
      .orderBy('admin.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 20);

    if (query.role) {
      queryBuilder.andWhere('admin.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('admin.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async updateAdmin(
    adminId: string,
    dto: UpdateAdminDto,
    updatedBy: string,
  ): Promise<AdminUser> {
    const admin = await this.adminUserRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const oldData = { ...admin };

    Object.assign(admin, dto);
    await this.adminUserRepository.save(admin);

    // Log audit
    await this.logAudit(updatedBy, 'UPDATE_ADMIN', 'admin_users', adminId, {
      before: oldData,
      after: dto,
    });

    return admin;
  }

  async deleteAdmin(adminId: string, deletedBy: string): Promise<void> {
    const admin = await this.adminUserRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    await this.adminUserRepository.remove(admin);

    // Log audit
    await this.logAudit(deletedBy, 'DELETE_ADMIN', 'admin_users', adminId, {
      email: admin.email,
      role: admin.role,
    });
  }

  async getUsers(query: GetUsersQueryDto): Promise<{
    data: PlatformUser[];
    total: number;
  }> {
    try {
      const whereClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (query.search) {
        whereClause.push(`(u.phone LIKE $${paramIndex} OR u.email LIKE $${paramIndex})`);
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      if (query.status) {
        whereClause.push(`u.isActive = $${paramIndex}`);
        params.push(query.status === 'active');
        paramIndex++;
      }

      const whereString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const allowedSortColumns = ['createdAt', 'phone', 'email', 'firstName', 'lastName'];
      const sortBy = allowedSortColumns.includes(query.sortBy || '') ? query.sortBy : 'createdAt';
      const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const data = await this.adminUserRepository.query(
        `
        SELECT u.id, u.phone, u.email, u.firstName, u.lastName, u.isActive, u.createdAt
        FROM users u
        ${whereString}
        ORDER BY u.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
        [...params, query.limit || 20, query.offset || 0],
      );

      const countResult = await this.adminUserRepository.query(
        `
        SELECT COUNT(*) as total
        FROM users u
        ${whereString}
      `,
        params,
      );

      return {
        data: data as PlatformUser[],
        total: parseInt(countResult[0]?.total || '0', 10)
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    adminId: string,
  ): Promise<void> {
    const query = `
      UPDATE users 
      SET isActive = $1, updatedAt = NOW()
      WHERE id = $2
    `;

    await this.adminUserRepository.query(query, [dto.isActive, userId]);

    // Log audit
    await this.logAudit(adminId, 'UPDATE_USER_STATUS', 'users', userId, {
      isActive: dto.isActive,
      reason: dto.reason,
    });
  }

  async createTriviaQuestion(
    dto: CreateTriviaQuestionDto,
    adminId: string,
  ): Promise<Partial<TriviaQuestion>> {
    const query = `
      INSERT INTO trivia_questions (
        question, options, correctAnswer, category, points, explanation, timeLimit, metadata, createdAt, updatedAt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, question, category, points
    `;

    const [result] = await this.adminUserRepository.query(query, [
      dto.question,
      JSON.stringify(dto.options),
      dto.correctAnswer,
      dto.category,
      dto.points || 10,
      dto.explanation,
      dto.timeLimit || 30,
      JSON.stringify(dto.metadata || {}),
    ]);

    // Log audit
    await this.logAudit(adminId, 'CREATE_TRIVIA', 'trivia_questions', result.id, {
      question: dto.question,
      category: dto.category,
    });

    await this.cacheService.clear('admin:trivia:*');

    return result;
  }

  async getTriviaQuestions(query: GetTriviaQuestionsQueryDto): Promise<{
    data: TriviaQuestion[];
    total: number;
  }> {
    const cacheKey = `admin:trivia:${query.category || 'all'}:${query.search || 'none'}:${query.offset || 0}:${query.limit || 20}`;

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const whereClause = [];
        const params = [];

        if (query.category) {
          whereClause.push(`category = $${params.length + 1}`);
          params.push(query.category);
        }

        if (query.search) {
          whereClause.push(`question ILIKE $${params.length + 1}`);
          params.push(`%${query.search}%`);
        }

        const offset = query.offset || 0;
        const limit = query.limit || 20;

        const data = await this.adminUserRepository.query(
          `
          SELECT * FROM trivia_questions
          ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
          ORDER BY createdAt DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
          [...params, limit, offset],
        );

        const countResult = await this.adminUserRepository.query(
          `
          SELECT COUNT(*) as total FROM trivia_questions
          ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
        `,
          params,
        );

        return {
          data,
          total: countResult[0]?.total || 0,
        };
      },
      600,
    );
  }

  async updateTriviaQuestion(
    questionId: string,
    dto: UpdateTriviaQuestionDto,
    adminId: string,
  ): Promise<void> {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (dto.question) {
      updates.push(`question = $${paramIndex}`);
      params.push(dto.question);
      paramIndex++;
    }

    if (dto.options) {
      updates.push(`options = $${paramIndex}`);
      params.push(JSON.stringify(dto.options));
      paramIndex++;
    }

    if (dto.correctAnswer !== undefined) {
      updates.push(`correctAnswer = $${paramIndex}`);
      params.push(dto.correctAnswer);
      paramIndex++;
    }

    if (dto.category) {
      updates.push(`category = $${paramIndex}`);
      params.push(dto.category);
      paramIndex++;
    }

    if (dto.points) {
      updates.push(`points = $${paramIndex}`);
      params.push(dto.points);
      paramIndex++;
    }

    updates.push(`updatedAt = NOW()`);
    params.push(questionId);

    if (updates.length > 1) {
      await this.adminUserRepository.query(
        `UPDATE trivia_questions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params,
      );

      // Log audit
      await this.logAudit(adminId, 'UPDATE_TRIVIA', 'trivia_questions', questionId, dto);

      await this.cacheService.clear('admin:trivia:*');
    }
  }

  async deleteTriviaQuestions(
    dto: BulkDeleteDto,
    adminId: string,
  ): Promise<{ deleted: number }> {
    const placeholders = dto.ids.map((_, i) => `$${i + 1}`).join(',');

    const result = await this.adminUserRepository.query(
      `DELETE FROM trivia_questions WHERE id IN (${placeholders})`,
      dto.ids,
    );

    // Log audit
    await this.logAudit(adminId, 'DELETE_TRIVIA', 'trivia_questions', '', {
      deletedIds: dto.ids,
    });

    await this.cacheService.clear('admin:trivia:*');

    return { deleted: result.affectedRows || dto.ids.length };
  }

  async createMarketplaceItem(
    dto: CreateMarketplaceItemDto,
    adminId: string,
  ): Promise<Partial<MarketplaceItem>> {
    const query = `
      INSERT INTO marketplace_items (
        name, description, type, coinPrice, cashValue, stockQuantity, isLimited, isFeatured, icon, displayOrder, metadata, isActive, createdAt, updatedAt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
      RETURNING id, name, type, coinPrice
    `;

    const [result] = await this.adminUserRepository.query(query, [
      dto.name,
      dto.description,
      dto.type,
      dto.coinPrice,
      dto.cashValue,
      dto.stockQuantity,
      dto.isLimited || false,
      dto.isFeatured || false,
      dto.icon,
      dto.displayOrder || 0,
      JSON.stringify(dto.metadata || {}),
    ]);

    // Log audit
    await this.logAudit(adminId, 'CREATE_MARKETPLACE_ITEM', 'marketplace_items', result.id, {
      name: dto.name,
      type: dto.type,
    });

    await this.cacheService.clear('admin:marketplace:*');

    return result;
  }

  async updateMarketplaceItem(
    itemId: string,
    dto: UpdateMarketplaceItemDto,
    adminId: string,
  ): Promise<void> {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (dto.name) {
      updates.push(`name = $${paramIndex}`);
      params.push(dto.name);
      paramIndex++;
    }

    if (dto.description) {
      updates.push(`description = $${paramIndex}`);
      params.push(dto.description);
      paramIndex++;
    }

    if (dto.coinPrice) {
      updates.push(`coinPrice = $${paramIndex}`);
      params.push(dto.coinPrice);
      paramIndex++;
    }

    if (dto.cashValue !== undefined) {
      updates.push(`cashValue = $${paramIndex}`);
      params.push(dto.cashValue);
      paramIndex++;
    }

    if (dto.stockQuantity !== undefined) {
      updates.push(`stockQuantity = $${paramIndex}`);
      params.push(dto.stockQuantity);
      paramIndex++;
    }

    if (dto.isFeatured !== undefined) {
      updates.push(`isFeatured = $${paramIndex}`);
      params.push(dto.isFeatured);
      paramIndex++;
    }

    if (dto.isActive !== undefined) {
      updates.push(`isActive = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }

    if (dto.displayOrder !== undefined) {
      updates.push(`displayOrder = $${paramIndex}`);
      params.push(dto.displayOrder);
      paramIndex++;
    }

    updates.push(`updatedAt = NOW()`);
    params.push(itemId);

    if (updates.length > 1) {
      await this.adminUserRepository.query(
        `UPDATE marketplace_items SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params,
      );

      // Log audit
      await this.logAudit(adminId, 'UPDATE_MARKETPLACE_ITEM', 'marketplace_items', itemId, dto);

      await this.cacheService.clear('admin:marketplace:*');
    }
  }

  async getMarketplaceItems(query: GetMarketplaceItemsQueryDto): Promise<{
    data: MarketplaceItem[];
    total: number;
  }> {
    const cacheKey = `admin:marketplace:${query.type || 'all'}:${query.isFeatured}:${query.isActive}:${query.offset || 0}:${query.limit || 20}`;

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const whereClause = [];
        const params = [];

        if (query.type) {
          whereClause.push(`type = $${params.length + 1}`);
          params.push(query.type);
        }

        if (query.isFeatured !== undefined) {
          whereClause.push(`isFeatured = $${params.length + 1}`);
          params.push(query.isFeatured);
        }

        if (query.isActive !== undefined) {
          whereClause.push(`isActive = $${params.length + 1}`);
          params.push(query.isActive);
        }

        const offset = query.offset || 0;
        const limit = query.limit || 20;

        const data = await this.adminUserRepository.query(
          `
          SELECT * FROM marketplace_items
          ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
          ORDER BY displayOrder ASC, createdAt DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
          [...params, limit, offset],
        );

        const countResult = await this.adminUserRepository.query(
          `
          SELECT COUNT(*) as total FROM marketplace_items
          ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}
        `,
          params,
        );

        return {
          data,
          total: countResult[0]?.total || 0,
        };
      },
      600,
    );
  }

  async deleteMarketplaceItems(
    dto: BulkDeleteDto,
    adminId: string,
  ): Promise<{ deleted: number }> {
    const placeholders = dto.ids.map((_, i) => `$${i + 1}`).join(',');

    const result = await this.adminUserRepository.query(
      `DELETE FROM marketplace_items WHERE id IN (${placeholders})`,
      dto.ids,
    );

    // Log audit
    await this.logAudit(adminId, 'DELETE_MARKETPLACE_ITEMS', 'marketplace_items', '', {
      deletedIds: dto.ids,
    });

    await this.cacheService.clear('admin:marketplace:*');

    return { deleted: result.affectedRows || dto.ids.length };
  }

  async getDashboardStats(): Promise<GetDashboardStatsDto> {
    try {
      const cacheKey = 'admin:dashboard:stats';

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const stats = await this.adminUserRepository.query(`
            SELECT
              (SELECT COUNT(*) FROM users) as totalUsers,
              (SELECT COUNT(*) FROM users WHERE "isActive" = true) as activeUsers,
              (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE status = 'success') as totalRevenue,
              (SELECT COUNT(*) FROM payment_transactions) as totalTransactions,
              (SELECT COUNT(*) FROM wallet_withdrawals WHERE status = 'pending') as pendingWithdrawals,
              (SELECT COUNT(*) FROM users WHERE DATE("createdAt") = CURRENT_DATE) as newUsersToday,
              (SELECT COUNT(*) FROM payment_transactions WHERE status = 'success') as totalPayments,
              (SELECT COALESCE(AVG(w.balance), 0) FROM wallets w) as avgUserValue
          `);
          return stats[0];
        },
        300,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get dashboard stats: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve dashboard statistics');
    }
  }

  async getRevenueAnalytics(query: GetAnalyticsQueryDto): Promise<RevenueAnalytics[]> {
    const startDate = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate || new Date();

    const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const endDateStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    const cacheKey = `admin:analytics:revenue:${startDateStr}-${endDateStr}`;

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.adminUserRepository.query(
          `
          SELECT
            DATE(createdAt) as date,
            COUNT(*) as transactionCount,
            SUM(amount) as totalAmount,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successfulCount
          FROM payment_transactions
          WHERE createdAt BETWEEN $1 AND $2
          GROUP BY DATE(createdAt)
          ORDER BY date DESC
        `,
          [startDate, endDate],
        );
        return result;
      },
      600,
    );
  }

  async getAuditLogs(query: GetAuditLogsQueryDto): Promise<{
    data: AdminAuditLog[];
    total: number;
  }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 50);

    if (query.adminId) {
      queryBuilder.andWhere('log.adminId = :adminId', { adminId: query.adminId });
    }

    if (query.action) {
      queryBuilder.andWhere('log.action = :action', { action: query.action });
    }

    if (query.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: query.resourceType,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  private async logAudit(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes: Record<string, any>,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        adminId,
        action,
        resourceType,
        resourceId,
        changes,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to log audit: ${errorMessage}`);
    }
  }

  // ============= SUPPORT TICKET MANAGEMENT =============
  async createSupportTicket(
    userId: number,
    dto: CreateSupportTicketDto,
  ): Promise<SupportTicket> {
    const ticket = this.supportTicketRepository.create({
      userId,
      ...dto,
      category: dto.category as any,
    });

    await this.supportTicketRepository.save(ticket);
    this.logger.log(`Support ticket created: ${ticket.id} by user ${userId}`);

    return ticket;
  }

  async getSupportTickets(
    query: GetSupportTicketsQueryDto,
  ): Promise<{ data: SupportTicket[]; total: number }> {
    const queryBuilder = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .skip(query.offset)
      .take(query.limit)
      .orderBy('ticket.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere('ticket.priority = :priority', { priority: query.priority });
    }

    if (query.assignedToId) {
      queryBuilder.andWhere('ticket.assignedToId = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    }

    if (query.userId) {
      queryBuilder.andWhere('ticket.userId = :userId', { userId: query.userId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async updateSupportTicket(
    ticketId: string,
    dto: UpdateSupportTicketDto,
    adminId: string,
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    Object.assign(ticket, dto);

    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      ticket.resolvedAt = new Date();
    }

    await this.supportTicketRepository.save(ticket);

    await this.logAudit(adminId, 'UPDATE_TICKET', 'support_tickets', ticketId, dto);

    this.logger.log(`Support ticket updated: ${ticketId} by admin ${adminId}`);
    return ticket;
  }

  // ============= USER MANAGEMENT =============
  async banUser(userId: number, dto: BanUserDto, adminId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId.toString() } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    // Note: Add bannedUntil and banReason fields to User entity if needed
    await this.userRepository.save(user);

    await this.logAudit(adminId, 'BAN_USER', 'users', userId.toString(), dto);

    this.logger.log(`User banned: ${userId} by admin ${adminId}`);
    return user;
  }

  async unbanUser(userId: number, adminId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId.toString() } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await this.userRepository.save(user);

    await this.logAudit(adminId, 'UNBAN_USER', 'users', userId.toString(), {});

    this.logger.log(`User unbanned: ${userId} by admin ${adminId}`);
    return user;
  }

  async adjustUserBalance(
    userId: number,
    dto: AdjustBalanceDto,
    adminId: string,
  ): Promise<{ coins: number; cash: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId.toString() },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      throw new BadRequestException('User wallet not found');
    }

    if (dto.type === 'COINS') {
      user.wallet.coinBalance += dto.amount;
    } else {
      user.wallet.cashBalance += dto.amount;
    }

    await this.userRepository.save(user);

    await this.logAudit(adminId, 'ADJUST_BALANCE', 'wallets', user.wallet.id.toString(), dto);

    this.logger.log(`Balance adjusted for user ${userId}: ${dto.amount} ${dto.type}`);

    return {
      coins: user.wallet.coinBalance,
      cash: user.wallet.cashBalance,
    };
  }

  // ============= LIVE MONITORING =============
  async getLiveStats(): Promise<LiveStats> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Active users (users with activity in last 5 minutes)
    const activeUsers = await this.triviaSessionRepository
      .createQueryBuilder('session')
      .where('session.startedAt > :fiveMinutesAgo', { fiveMinutesAgo })
      .select('COUNT(DISTINCT session.userId)', 'count')
      .getRawOne();

    // Active games (in-progress sessions)
    const activeGames = await this.triviaSessionRepository.count({
      where: { completedAt: undefined as any },
    });

    // Recent transactions (last 5 minutes)
    const recentTransactions = await this.transactionRepository.count({
      where: {
        createdAt: MoreThan(fiveMinutesAgo),
      },
    });

    // Server metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuUsage = os.loadavg()[0] / os.cpus().length;

    return {
      activeUsers: parseInt(activeUsers.count) || 0,
      activeGames,
      recentTransactions,
      serverLoad: {
        cpu: Math.round(cpuUsage * 100),
        memory: Math.round((usedMem / totalMem) * 100),
      },
    };
  }

  async getActiveGames(limit: number = 50): Promise<ActiveGame[]> {
    const sessions = await this.triviaSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.completedAt IS NULL')
      .orderBy('session.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return sessions.map((session) => ({
      userId: parseInt(session.userId),
      username: session.user?.phone || 'Unknown',
      gameType: 'Trivia',
      startedAt: session.createdAt,
      duration: Math.floor((Date.now() - session.createdAt.getTime()) / 1000),
    }));
  }

  async getRecentTransactions(limit: number = 50): Promise<RecentTransaction[]> {
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .orderBy('transaction.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return transactions.map((tx) => ({
      id: tx.id.toString(),
      userId: tx.wallet?.user?.id ? parseInt(tx.wallet.user.id) : 0,
      username: tx.wallet?.user?.phone || 'Unknown',
      type: tx.type,
      amount: tx.amount,
      createdAt: tx.createdAt,
    }));
  }

  // ============= STATISTICS GENERATION =============
  async generateDailyStats(date: Date = new Date()): Promise<AdminStats> {
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59Z');

    const existing = await this.adminStatsRepository.findOne({
      where: { date: dateStr, type: StatsType.DAILY },
    });

    if (existing) {
      return existing;
    }

    // User metrics
    const totalUsers = await this.userRepository.count();
    const newUsers = await this.userRepository.count({
      where: {
        createdAt: MoreThan(startOfDay),
      },
    });

    // Game metrics
    const games = await this.triviaSessionRepository
      .createQueryBuilder('session')
      .where('session.startedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    // Transaction metrics
    const transactions = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .getMany();

    const coinPurchases = transactions
      .filter((tx) => tx.type === TransactionType.COIN_PURCHASE)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const stats = this.adminStatsRepository.create({
      date: dateStr,
      type: StatsType.DAILY,
      totalUsers,
      newUsers,
      totalGames: games,
      triviaGames: games,
      coinPurchases,
      totalRevenue: coinPurchases,
    });

    await this.adminStatsRepository.save(stats);

    this.logger.log(`Generated daily stats for ${dateStr}`);
    return stats;
  }
}
