import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from '../service/admin.service';
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
  GetAuditLogsQueryDto,
} from '../dto/admin.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== ADMIN AUTHENTICATION ====================

  /**
   * Admin login
   * POST /admin/login
   */
  @Post('login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return await this.adminService.adminLogin(dto);
  }

  /**
   * Create new admin
   * POST /admin/users
   */
  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createAdmin(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAdminDto,
  ) {
    return await this.adminService.createAdmin(dto, req.user.id);
  }

  /**
   * Get all admin users
   * GET /admin/users?limit=20&offset=0
   */
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAdmins(@Query() query: GetAdminsQueryDto) {
    return await this.adminService.getAdmins(query);
  }

  /**
   * Update admin user
   * PUT /admin/users/:adminId
   */
  @Put('users/:adminId')
  @UseGuards(JwtAuthGuard)
  async updateAdmin(
    @Request() req: RequestWithUser,
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return await this.adminService.updateAdmin(adminId, dto, req.user.id);
  }

  /**
   * Delete admin user
   * DELETE /admin/users/:adminId
   */
  @Delete('users/:adminId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteAdmin(
    @Request() req: RequestWithUser,
    @Param('adminId') adminId: string,
  ) {
    await this.adminService.deleteAdmin(adminId, req.user.id);
    return { status: 'success' };
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users
   * GET /admin/platform-users?limit=20&offset=0&search=phone
   */
  @Get('platform-users')
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() query: GetUsersQueryDto) {
    return await this.adminService.getUsers(query);
  }

  /**
   * Update user status
   * PUT /admin/platform-users/:userId/status
   */
  @Put('platform-users/:userId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateUserStatus(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    await this.adminService.updateUserStatus(userId, dto, req.user.id);
    return { status: 'success' };
  }

  // ==================== TRIVIA CONTENT MANAGEMENT ====================

  /**
   * Create trivia question
   * POST /admin/content/trivia
   */
  @Post('content/trivia')
  @UseGuards(JwtAuthGuard)
  async createTriviaQuestion(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTriviaQuestionDto,
  ) {
    return await this.adminService.createTriviaQuestion(dto, req.user.id);
  }

  /**
   * Get trivia questions
   * GET /admin/content/trivia?limit=20&offset=0&category=science
   */
  @Get('content/trivia')
  @UseGuards(JwtAuthGuard)
  async getTriviaQuestions(@Query() query: GetTriviaQuestionsQueryDto) {
    return await this.adminService.getTriviaQuestions(query);
  }

  /**
   * Update trivia question
   * PUT /admin/content/trivia/:questionId
   */
  @Put('content/trivia/:questionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateTriviaQuestion(
    @Request() req: RequestWithUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateTriviaQuestionDto,
  ) {
    await this.adminService.updateTriviaQuestion(questionId, dto, req.user.id);
    return { status: 'success' };
  }

  /**
   * Delete trivia questions
   * DELETE /admin/content/trivia/bulk
   */
  @Delete('content/trivia/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteTriviaQuestions(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteTriviaQuestions(dto, req.user.id);
  }

  

  /**
   * Create marketplace item
   * POST /admin/content/marketplace
   */
  @Post('content/marketplace')
  @UseGuards(JwtAuthGuard)
  async createMarketplaceItem(
    @Request() req: RequestWithUser,
    @Body() dto: CreateMarketplaceItemDto,
  ) {
    return await this.adminService.createMarketplaceItem(dto, req.user.id);
  }

  /**
   * Get marketplace items
   * GET /admin/content/marketplace?limit=20&offset=0&type=airtime
   */
  @Get('content/marketplace')
  @UseGuards(JwtAuthGuard)
  async getMarketplaceItems(@Query() query: GetMarketplaceItemsQueryDto) {
    return await this.adminService.getMarketplaceItems(query);
  }

  /**
   * Update marketplace item
   * PUT /admin/content/marketplace/:itemId
   */
  @Put('content/marketplace/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateMarketplaceItem(
    @Request() req: RequestWithUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMarketplaceItemDto,
  ) {
    await this.adminService.updateMarketplaceItem(itemId, dto, req.user.id);
    return { status: 'success' };
  }

  /**
   * Delete marketplace items
   * DELETE /admin/content/marketplace/bulk
   */
  @Delete('content/marketplace/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteMarketplaceItems(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteMarketplaceItems(dto, req.user.id);
  }

  

  /**
   * Get dashboard statistics
   * GET /admin/analytics/dashboard
   */
  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats() {
    return await this.adminService.getDashboardStats();
  }

  /**
   * Get revenue analytics
   * GET /admin/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('analytics/revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenueAnalytics(@Query() query: GetAnalyticsQueryDto) {
    return await this.adminService.getRevenueAnalytics(query);
  }

  // ==================== AUDIT LOGS ====================

  /**
   * Get audit logs
   * GET /admin/audit-logs?limit=50&offset=0
   */
  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  async getAuditLogs(@Query() query: GetAuditLogsQueryDto) {
    return await this.adminService.getAuditLogs(query);
  }
}
