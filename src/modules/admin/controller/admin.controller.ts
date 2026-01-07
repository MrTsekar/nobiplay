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
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  GetSupportTicketsQueryDto,
  BanUserDto,
  AdjustBalanceDto,
} from '../dto/admin.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return await this.adminService.adminLogin(dto);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createAdmin(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAdminDto,
  ) {
    return await this.adminService.createAdmin(dto, req.user.userId);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAdmins(@Query() query: GetAdminsQueryDto) {
    return await this.adminService.getAdmins(query);
  }

  @Put('users/:adminId')
  @UseGuards(JwtAuthGuard)
  async updateAdmin(
    @Request() req: RequestWithUser,
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return await this.adminService.updateAdmin(adminId, dto, req.user.userId);
  }

  @Delete('users/:adminId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteAdmin(
    @Request() req: RequestWithUser,
    @Param('adminId') adminId: string,
  ) {
    await this.adminService.deleteAdmin(adminId, req.user.userId);
    return { status: 'success' };
  }

  @Get('platform-users')
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() query: GetUsersQueryDto) {
    return await this.adminService.getUsers(query);
  }

  @Put('platform-users/:userId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateUserStatus(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    await this.adminService.updateUserStatus(userId, dto, req.user.userId);
    return { status: 'success' };
  }

  @Post('content/trivia')
  @UseGuards(JwtAuthGuard)
  async createTriviaQuestion(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTriviaQuestionDto,
  ) {
    return await this.adminService.createTriviaQuestion(dto, req.user.userId);
  }

  @Get('content/trivia')
  @UseGuards(JwtAuthGuard)
  async getTriviaQuestions(@Query() query: GetTriviaQuestionsQueryDto) {
    return await this.adminService.getTriviaQuestions(query);
  }

  @Put('content/trivia/:questionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateTriviaQuestion(
    @Request() req: RequestWithUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateTriviaQuestionDto,
  ) {
    await this.adminService.updateTriviaQuestion(questionId, dto, req.user.userId);
    return { status: 'success' };
  }

  @Delete('content/trivia/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteTriviaQuestions(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteTriviaQuestions(dto, req.user.userId);
  }

  @Post('content/marketplace')
  @UseGuards(JwtAuthGuard)
  async createMarketplaceItem(
    @Request() req: RequestWithUser,
    @Body() dto: CreateMarketplaceItemDto,
  ) {
    return await this.adminService.createMarketplaceItem(dto, req.user.userId);
  }

  @Get('content/marketplace')
  @UseGuards(JwtAuthGuard)
  async getMarketplaceItems(@Query() query: GetMarketplaceItemsQueryDto) {
    return await this.adminService.getMarketplaceItems(query);
  }

  @Put('content/marketplace/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateMarketplaceItem(
    @Request() req: RequestWithUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMarketplaceItemDto,
  ) {
    await this.adminService.updateMarketplaceItem(itemId, dto, req.user.userId);
    return { status: 'success' };
  }

  @Delete('content/marketplace/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteMarketplaceItems(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteMarketplaceItems(dto, req.user.userId);
  }

  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats() {
    return await this.adminService.getDashboardStats();
  }

  @Get('analytics/revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenueAnalytics(@Query() query: GetAnalyticsQueryDto) {
    return await this.adminService.getRevenueAnalytics(query);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  async getAuditLogs(@Query() query: GetAuditLogsQueryDto) {
    return await this.adminService.getAuditLogs(query);
  }

  // ============= SUPPORT TICKETS =============
  @Post('support/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create support ticket (user endpoint)' })
  async createSupportTicket(
    @Request() req: RequestWithUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return await this.adminService.createSupportTicket(parseInt(req.user.userId), dto);
  }

  @Get('support/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get support tickets' })
  async getSupportTickets(@Query() query: GetSupportTicketsQueryDto) {
    return await this.adminService.getSupportTickets(query);
  }

  @Put('support/tickets/:ticketId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update support ticket (admin only)' })
  async updateSupportTicket(
    @Request() req: RequestWithUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return await this.adminService.updateSupportTicket(ticketId, dto, req.user.userId);
  }

  // ============= USER MANAGEMENT =============
  @Post('users/:userId/ban')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ban user' })
  async banUser(
    @Request() req: RequestWithUser,
    @Param('userId') userId: number,
    @Body() dto: BanUserDto,
  ) {
    return await this.adminService.banUser(userId, dto, req.user.userId);
  }

  @Post('users/:userId/unban')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unban user' })
  async unbanUser(
    @Request() req: RequestWithUser,
    @Param('userId') userId: number,
  ) {
    return await this.adminService.unbanUser(userId, req.user.userId);
  }

  @Post('users/:userId/adjust-balance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Adjust user balance' })
  async adjustBalance(
    @Request() req: RequestWithUser,
    @Param('userId') userId: number,
    @Body() dto: AdjustBalanceDto,
  ) {
    return await this.adminService.adjustUserBalance(userId, dto, req.user.userId);
  }

  // ============= LIVE MONITORING =============
  @Get('monitoring/live-stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get live platform statistics' })
  async getLiveStats() {
    return await this.adminService.getLiveStats();
  }

  @Get('monitoring/active-games')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get currently active games' })
  async getActiveGames(@Query('limit') limit: number = 50) {
    return await this.adminService.getActiveGames(limit);
  }

  @Get('monitoring/recent-transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recent transactions' })
  async getRecentTransactions(@Query('limit') limit: number = 50) {
    return await this.adminService.getRecentTransactions(limit);
  }

  @Post('stats/generate-daily')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate daily statistics' })
  async generateDailyStats(@Body('date') date?: string) {
    const statsDate = date ? new Date(date) : new Date();
    return await this.adminService.generateDailyStats(statsDate);
  }
}
