import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  IsObject,
  IsBoolean,
  IsDate,
  IsPhoneNumber,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationCategory } from '../entity/notification.entity';

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean = false;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendBulkNotificationDto {
  @IsArray()
  @ArrayMinSize(1)
  userIds: string[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean = false;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isArchived?: boolean;
}

export class MarkNotificationAsReadDto {
  @IsUUID()
  notificationId: string;
}

export class MarkAllAsReadDto {
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;
}

export class ArchiveNotificationDto {
  @IsUUID()
  notificationId: string;
}

export class DeleteNotificationDto {
  @IsUUID()
  notificationId: string;
}

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsObject()
  categoryPreferences?: Record<string, boolean>;
}

export class GetNotificationPreferencesDto {
  @IsUUID()
  userId: string;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsObject()
  categoryPreferences?: Record<string, boolean>;
}

export class NotificationResponseDto {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  status: string;
  isRead: boolean;
  isPriority: boolean;
  createdAt: Date;
}

export class SendEmailNotificationDto {
  @IsEmail()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  template: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class SendSmsNotificationDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  senderId?: string;
}

export class SendPushNotificationDto {
  @IsString()
  fcmToken: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
