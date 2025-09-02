// Export all public APIs from the notification module
export { NotificationModule } from './notification.module';
export { NotificationService } from './services/notification.service';
export { EmailService } from './services/email.service';
export { InAppNotificationService } from './services/in-app-notification.service';
export { NotificationController } from './controllers/notification.controller';
export { MailConfig } from './config/mail.config';

// Export DTOs
export {
  CreateNotificationDto,
  NotificationDto,
  EmailNotificationDto,
  EmailAttachmentDto,
  InAppNotificationDto,
  PushNotificationDto,
  TaskNotificationDataDto,
  ProjectNotificationDataDto,
  CommentNotificationDataDto,
  NotificationPreferencesDto,
  NotificationResponseDto,
  BulkNotificationDto,
  NotificationStatsDto,
  NotificationFilterDto,
} from './dto/notification.dto';

// Export Enums
export {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  TaskPriority,
  TaskStatus,
  ProjectRole,
  EmailTemplate,
} from './enums/notification.enum';
