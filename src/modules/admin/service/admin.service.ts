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
import { Repository, Like, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  AdminUser,
  AdminRole,
  AdminPermission,
  AdminAuditLog,
} from '../entity/admin.entity';
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
} from '../dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminAuditLog)
    private auditLogRepository: Repository<AdminAuditLog>,
    private jwtService: JwtService,
  ) {}

  // ==================== ADMIN AUTHENTICATION ====================

  /**
   * Register a new admin user
   */
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

  /**
   * Admin login
   */
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

  /**
   * Get all admin users
   */
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

  /**
   * Update admin user
   */
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

  /**
   * Delete admin user
   */
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

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users (admin view)
   */
  async getUsers(query: GetUsersQueryDto): Promise<{
    data: any[];
    total: number;
  }> {
    const whereConditions: any = {};

    if (query.search) {
      whereConditions.phone = Like(`%${query.search}%`);
    }

    if (query.status) {
      whereConditions.isActive = query.status === 'active';
    }

    const [data, total] = await this.adminUserRepository
      .query(
        `
        SELECT u.id, u.phone, u.email, u.firstName, u.lastName, u.isActive, u.createdAt
        FROM users u
        ${query.search ? `WHERE u.phone LIKE '%${query.search}%' OR u.email LIKE '%${query.search}%'` : ''}
        ${query.status ? `${query.search ? 'AND' : 'WHERE'} u.isActive = ${query.status === 'active'}` : ''}
        ORDER BY u.${query.sortBy || 'createdAt'} ${query.sortOrder || 'DESC'}
        LIMIT $1 OFFSET $2
      `,
        [query.limit || 20, query.offset || 0],
      )
      .then(data => {
        return this.adminUserRepository.query(
          `
          SELECT COUNT(*) as total
          FROM users u
          ${query.search ? `WHERE u.phone LIKE '%${query.search}%' OR u.email LIKE '%${query.search}%'` : ''}
          ${query.status ? `${query.search ? 'AND' : 'WHERE'} u.isActive = ${query.status === 'active'}` : ''}
        `,
        );
      })
      .catch(err => {
        throw new InternalServerErrorException(err.message);
      });

    return { data, total: total[0]?.total || 0 };
  }

  /**
   * Update user status
   */
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

  // ==================== TRIVIA CONTENT MANAGEMENT ====================

  /**
   * Create trivia question
   */
  async createTriviaQuestion(
    dto: CreateTriviaQuestionDto,
    adminId: string,
  ): Promise<any> {
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

    return result;
  }

  /**
   * Get trivia questions
   */
  async getTriviaQuestions(query: GetTriviaQuestionsQueryDto): Promise<{
    data: any[];
    total: number;
  }> {
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
  }

  /**
   * Update trivia question
   */
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
    }
  }

  /**
   * Delete trivia questions
   */
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

    return { deleted: result.affectedRows || dto.ids.length };
  }

  // ==================== MARKETPLACE MANAGEMENT ====================

  /**
   * Create marketplace item
   */
  async createMarketplaceItem(
    dto: CreateMarketplaceItemDto,
    adminId: string,
  ): Promise<any> {
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

    return result;
  }

  /**
   * Update marketplace item
   */
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
    }
  }

  /**
   * Get marketplace items
   */
  async getMarketplaceItems(query: GetMarketplaceItemsQueryDto): Promise<{
    data: any[];
    total: number;
  }> {
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
  }

  /**
   * Delete marketplace items
   */
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

    return { deleted: result.affectedRows || dto.ids.length };
  }

  // ==================== ANALYTICS ====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<GetDashboardStatsDto> {
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get dashboard stats: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve dashboard statistics');
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(query: GetAnalyticsQueryDto): Promise<any> {
    const startDate = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate || new Date();

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
  }

  // ==================== AUDIT LOGS ====================

  /**
   * Get audit logs
   */
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

  /**
   * Log audit trail
   */
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
}
