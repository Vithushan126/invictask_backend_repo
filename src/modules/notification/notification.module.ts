import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { MailConfig } from './config/mail.config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailService,
    InAppNotificationService,
    MailConfig,
  ],
  exports: [
    NotificationService,
    EmailService,
    InAppNotificationService,
    MailConfig,
  ],
})
export class NotificationModule {}
