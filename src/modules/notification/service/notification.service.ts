import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationStatus, NotificationType } from '../entity/notification.entity';
import {
  SendNotificationDto,
  SendBulkNotificationDto,
  GetNotificationsQueryDto,
  MarkNotificationAsReadDto,
  ArchiveNotificationDto,
  SendEmailNotificationDto,
  SendSmsNotificationDto,
  SendPushNotificationDto,
  NotificationResponseDto,
} from '../dto/notification.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private firebaseAdmin: any;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private configService: ConfigService,
  ) {
    this.initializeNotificationProviders();
  }

  private initializeNotificationProviders() {
    // Initialize Email Provider (Nodemailer)
    this.emailTransporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });

    // Initialize SMS Provider (Twilio)
    if (this.configService.get('TWILIO_ACCOUNT_SID')) {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        this.configService.get('TWILIO_ACCOUNT_SID'),
        this.configService.get('TWILIO_AUTH_TOKEN'),
      );
    }

    // Initialize Firebase Admin for Push Notifications
    if (this.configService.get('FIREBASE_PROJECT_ID')) {
      const admin = require('firebase-admin');
      const serviceAccount = {
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      this.firebaseAdmin = admin;
    }
  }

  /**
   * Send notification to a single user
   */
  async sendNotification(
    userId: string,
    dto: SendNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      const notification = this.notificationRepository.create({
        userId,
        type: dto.type,
        category: dto.category,
        title: dto.title,
        message: dto.message,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        fcmToken: dto.fcmToken,
        actionUrl: dto.actionUrl,
        isPriority: dto.isPriority,
        metadata: dto.metadata,
        scheduledFor: dto.scheduledFor,
      });

      await this.notificationRepository.save(notification);

      // Send immediately if no scheduled time
      if (!dto.scheduledFor || new Date(dto.scheduledFor) <= new Date()) {
        await this.deliverNotification(notification);
      }

      return this.mapNotificationToDto(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send notification: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to send notification');
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(dto: SendBulkNotificationDto): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    try {
      const notifications = dto.userIds.map(userId =>
        this.notificationRepository.create({
          userId,
          type: dto.type,
          category: dto.category,
          title: dto.title,
          message: dto.message,
          actionUrl: dto.actionUrl,
          isPriority: dto.isPriority,
          metadata: dto.metadata,
        }),
      );

      await this.notificationRepository.save(notifications);

      let successful = 0;
      let failed = 0;

      // Send all notifications
      for (const notification of notifications) {
        try {
          await this.deliverNotification(notification);
          successful++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to deliver notification ${notification.id}: ${errorMessage}`,
          );
          failed++;
        }
      }

      return {
        total: notifications.length,
        successful,
        failed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send bulk notifications: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to send bulk notifications');
    }
  }

  /**
   * Deliver notification based on type
   */
  private async deliverNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.type) {
        case NotificationType.PUSH:
          if (notification.fcmToken) {
            await this.sendPushNotification({
              fcmToken: notification.fcmToken,
              title: notification.title,
              body: notification.message,
              data: notification.metadata,
            });
          }
          break;

        case NotificationType.SMS:
          if (notification.phoneNumber) {
            await this.sendSmsNotification({
              phoneNumber: notification.phoneNumber,
              message: notification.message,
            });
          }
          break;

        case NotificationType.EMAIL:
          if (notification.email) {
            await this.sendEmailNotification({
              email: notification.email,
              subject: notification.title,
              template: 'notification',
              context: {
                title: notification.title,
                message: notification.message,
                ...notification.metadata,
              },
            });
          }
          break;

        case NotificationType.IN_APP:
          // In-app notifications are just stored in DB, no delivery needed
          notification.status = NotificationStatus.DELIVERED;
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      notification.deliveredAt = new Date();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = errorMessage;
      notification.retryCount = (notification.retryCount || 0) + 1;
      throw error;
    } finally {
      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Send push notification via Firebase
   */
  private async sendPushNotification(dto: SendPushNotificationDto): Promise<void> {
    try {
      if (!this.firebaseAdmin) {
        throw new Error('Firebase not configured');
      }

      const message: any = {
        notification: {
          title: dto.title,
          body: dto.body,
        },
        data: dto.data || {},
        token: dto.fcmToken,
      };

      if (dto.imageUrl) {
        message.notification.imageUrl = dto.imageUrl;
      }

      const response = await this.firebaseAdmin.messaging().send(message);
      this.logger.log(`Push notification sent: ${response}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send push notification: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSmsNotification(dto: SendSmsNotificationDto): Promise<void> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
      const response = await this.twilioClient.messages.create({
        body: dto.message,
        from: dto.senderId || phoneNumber,
        to: dto.phoneNumber,
      });

      this.logger.log(`SMS sent: ${response.sid}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send SMS: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send email notification via Nodemailer
   */
  private async sendEmailNotification(dto: SendEmailNotificationDto): Promise<void> {
    try {
      const emailContent = this.generateEmailContent(
        dto.template,
        dto.context || {},
      );

      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || '';
      const mailOptions = {
        from: fromEmail,
        to: dto.email,
        subject: dto.subject,
        html: emailContent,
      };

      const response = await this.emailTransporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${response.messageId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 20);

    if (query.category) {
      queryBuilder.andWhere('notification.category = :category', {
        category: query.category,
      });
    }

    if (query.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', {
        isRead: query.isRead,
      });
    }

    if (query.isArchived !== undefined) {
      queryBuilder.andWhere('notification.isArchived = :isArchived', {
        isArchived: query.isArchived,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(n => this.mapNotificationToDto(n)),
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    notification.status = NotificationStatus.READ;

    await this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    userId: string,
    category?: string,
  ): Promise<{ updated: number }> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.isRead = :isRead', { isRead: false });

    if (category) {
      query.andWhere('notification.category = :category', { category });
    }

    const notifications = await query.getMany();

    for (const notification of notifications) {
      notification.isRead = true;
      notification.readAt = new Date();
      notification.status = NotificationStatus.READ;
    }

    await this.notificationRepository.save(notifications);

    return { updated: notifications.length };
  }

  /**
   * Archive notification
   */
  async archiveNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isArchived = true;
    await this.notificationRepository.save(notification);
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.delete(notificationId);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    });
  }

  /**
   * Generate email content from template
   */
  private generateEmailContent(template: string, context: Record<string, any>): string {
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
            .footer { text-align: center; padding-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${context.title || 'Notification'}</h2>
            </div>
            <div class="content">
              <p>${context.message || ''}</p>
              ${context.actionUrl ? `<a href="${context.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>` : ''}
            </div>
            <div class="footer">
              <p>© 2024 Nobiplay. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  /**
   * Map notification to DTO
   */
  private mapNotificationToDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      status: notification.status,
      isRead: notification.isRead,
      isPriority: notification.isPriority,
      createdAt: notification.createdAt,
    };
  }
}
