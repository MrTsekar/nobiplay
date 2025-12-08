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
    return await this.adminService.createAdmin(dto, req.user.id);
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
    return await this.adminService.updateAdmin(adminId, dto, req.user.id);
  }

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
    await this.adminService.updateUserStatus(userId, dto, req.user.id);
    return { status: 'success' };
  }

  @Post('content/trivia')
  @UseGuards(JwtAuthGuard)
  async createTriviaQuestion(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTriviaQuestionDto,
  ) {
    return await this.adminService.createTriviaQuestion(dto, req.user.id);
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
    await this.adminService.updateTriviaQuestion(questionId, dto, req.user.id);
    return { status: 'success' };
  }

  @Delete('content/trivia/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteTriviaQuestions(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteTriviaQuestions(dto, req.user.id);
  }

  @Post('content/marketplace')
  @UseGuards(JwtAuthGuard)
  async createMarketplaceItem(
    @Request() req: RequestWithUser,
    @Body() dto: CreateMarketplaceItemDto,
  ) {
    return await this.adminService.createMarketplaceItem(dto, req.user.id);
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
    await this.adminService.updateMarketplaceItem(itemId, dto, req.user.id);
    return { status: 'success' };
  }

  @Delete('content/marketplace/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async deleteMarketplaceItems(
    @Request() req: RequestWithUser,
    @Body() dto: BulkDeleteDto,
  ) {
    return await this.adminService.deleteMarketplaceItems(dto, req.user.id);
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
}
