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
import { NotificationService } from '../service/notification.service';
import {
  SendNotificationDto,
  SendBulkNotificationDto,
  GetNotificationsQueryDto,
  MarkNotificationAsReadDto,
  ArchiveNotificationDto,
  DeleteNotificationDto,
} from '../dto/notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Notification')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Send notification to user
   * POST /notifications/send
   */
  @Post('send')
  async sendNotification(
    @Request() req: RequestWithUser,
    @Body() dto: SendNotificationDto,
  ) {
    return await this.notificationService.sendNotification(req.user.userId, dto);
  }

  /**
   * Send bulk notifications
   * POST /notifications/send-bulk
   */
  @Post('send-bulk')
  async sendBulkNotification(@Body() dto: SendBulkNotificationDto) {
    return await this.notificationService.sendBulkNotification(dto);
  }

  /**
   * Get user notifications
   * GET /notifications?limit=20&offset=0&category=payment
   */
  @Get()
  async getNotifications(
    @Request() req: RequestWithUser,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return await this.notificationService.getNotifications(req.user.userId, query);
  }

  /**
   * Get unread notification count
   * GET /notifications/count/unread
   */
  @Get('count/unread')
  async getUnreadCount(@Request() req: RequestWithUser) {
    const count = await this.notificationService.getUnreadCount(req.user.userId);
    return { unreadCount: count };
  }

  /**
   * Mark notification as read
   * PUT /notifications/:notificationId/read
   */
  @Put(':notificationId/read')
  @HttpCode(200)
  async markAsRead(
    @Request() req: RequestWithUser,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notificationService.markAsRead(req.user.userId, notificationId);
    return { status: 'success' };
  }

  /**
   * Mark all notifications as read
   * PUT /notifications/read-all
   */
  @Put('read-all')
  @HttpCode(200)
  async markAllAsRead(
    @Request() req: RequestWithUser,
    @Query('category') category?: string,
  ) {
    return await this.notificationService.markAllAsRead(req.user.userId, category);
  }

  /**
   * Archive notification
   * PUT /notifications/:notificationId/archive
   */
  @Put(':notificationId/archive')
  @HttpCode(200)
  async archiveNotification(
    @Request() req: RequestWithUser,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notificationService.archiveNotification(req.user.userId, notificationId);
    return { status: 'success' };
  }

  /**
   * Delete notification
   * DELETE /notifications/:notificationId
   */
  @Delete(':notificationId')
  @HttpCode(200)
  async deleteNotification(
    @Request() req: RequestWithUser,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notificationService.deleteNotification(req.user.userId, notificationId);
    return { status: 'success' };
  }
}
