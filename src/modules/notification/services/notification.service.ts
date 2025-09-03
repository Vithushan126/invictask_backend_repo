import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import {
  CreateNotificationDto,
  NotificationDto,
  TaskNotificationDataDto,
  ProjectNotificationDataDto,
  CommentNotificationDataDto,
  NotificationPreferencesDto,
  BulkNotificationDto,
  NotificationStatsDto,
  NotificationFilterDto,
} from '../dto/notification.dto';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from '../enums/notification.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // In a real application, this would be stored in a database
  private userPreferences: Map<string, NotificationPreferencesDto> = new Map();

  constructor(
    private readonly emailService: EmailService,
    private readonly inAppService: InAppNotificationService,
  ) {}

  async sendNotification(
    notificationData: CreateNotificationDto,
  ): Promise<NotificationDto[]> {
    console.log('sendNotification', notificationData);

    const results: NotificationDto[] = [];

    // Get user preferences
    const preferences = await this.getUserPreferences(
      notificationData.recipientId,
    );

    // Filter channels based on user preferences
    const enabledChannels = this.filterChannelsByPreferences(
      notificationData.channels,
      notificationData.type,
      preferences,
    );

    // Send to each enabled channel
    for (const channel of enabledChannels) {
      try {
        let result: NotificationDto | null = null;

        switch (channel) {
          case NotificationChannel.EMAIL:
            result = await this.sendEmailNotification(notificationData);
            break;
          case NotificationChannel.IN_APP:
            result = await this.sendInAppNotification(notificationData);
            break;
          case NotificationChannel.PUSH:
            result = await this.sendPushNotification(notificationData);
            break;
          // Add other channels as needed
        }

        if (result) {
          results.push(result);
        }
      } catch (error) {
        this.logger.error(
          `Failed to send notification via ${channel}: ${error.message}`,
        );
      }
    }

    return results;
  }

  async sendTaskNotification(
    type: NotificationType,
    recipientId: string,
    taskData: TaskNotificationDataDto,
    senderId?: string,
  ): Promise<NotificationDto[]> {
    const notificationData: CreateNotificationDto = {
      type,
      title: this.getTaskNotificationTitle(type, taskData),
      message: this.getTaskNotificationMessage(type, taskData),
      recipientId,
      senderId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: this.getNotificationPriority(type),
      data: taskData,
    };

    return this.sendNotification(notificationData);
  }

  async sendProjectNotification(
    type: NotificationType,
    recipientId: string,
    projectData: ProjectNotificationDataDto,
    senderId?: string,
  ): Promise<NotificationDto[]> {
    const notificationData: CreateNotificationDto = {
      type,
      title: this.getProjectNotificationTitle(type, projectData),
      message: this.getProjectNotificationMessage(type, projectData),
      recipientId,
      senderId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: this.getNotificationPriority(type),
      data: projectData,
    };

    return this.sendNotification(notificationData);
  }

  async sendCommentNotification(
    type: NotificationType,
    recipientId: string,
    commentData: CommentNotificationDataDto,
    senderId?: string,
  ): Promise<NotificationDto[]> {
    const notificationData: CreateNotificationDto = {
      type,
      title: this.getCommentNotificationTitle(type, commentData),
      message: this.getCommentNotificationMessage(type, commentData),
      recipientId,
      senderId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority:
        type === NotificationType.COMMENT_MENTION
          ? NotificationPriority.HIGH
          : NotificationPriority.MEDIUM,
      data: commentData,
    };

    return this.sendNotification(notificationData);
  }

  async sendBulkNotifications(
    bulkData: BulkNotificationDto,
  ): Promise<NotificationDto[]> {
    const results: NotificationDto[] = [];

    for (const notification of bulkData.notifications) {
      try {
        const notificationResults = await this.sendNotification(notification);
        results.push(...notificationResults);
      } catch (error) {
        this.logger.error(`Failed to send bulk notification: ${error.message}`);
      }
    }

    this.logger.log(`Sent ${results.length} notifications from bulk request`);
    return results;
  }

  async getUserNotifications(
    userId: string,
    filter?: NotificationFilterDto,
  ): Promise<NotificationDto[]> {
    return this.inAppService.getUserNotifications(userId, filter);
  }

  async markNotificationAsRead(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    return this.inAppService.markAsRead(userId, notificationId);
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    return this.inAppService.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.inAppService.getUnreadCount(userId);
  }

  async updateUserPreferences(
    userId: string,
    preferences: NotificationPreferencesDto,
  ): Promise<void> {
    this.userPreferences.set(userId, preferences);
    this.logger.log(`Updated notification preferences for user ${userId}`);
  }

  async getUserPreferences(
    userId: string,
  ): Promise<NotificationPreferencesDto> {
    return (
      this.userPreferences.get(userId) || this.getDefaultPreferences(userId)
    );
  }

  private async sendEmailNotification(
    notificationData: CreateNotificationDto,
  ): Promise<NotificationDto | null> {
    // This would typically get the user's email from a user service
    const userEmail = `user-${notificationData.recipientId}@example.com`;

    try {
      let emailSent = false;

      switch (notificationData.type) {
        case NotificationType.TASK_ASSIGNED:
          emailSent = await this.emailService.sendTaskAssignedEmail(
            userEmail,
            notificationData.data as TaskNotificationDataDto,
          );
          break;
        case NotificationType.TASK_DUE_SOON:
          emailSent = await this.emailService.sendTaskDueReminderEmail(
            userEmail,
            notificationData.data as TaskNotificationDataDto,
          );
          break;
        case NotificationType.PROJECT_MEMBER_ADDED:
          emailSent = await this.emailService.sendProjectInvitationEmail(
            userEmail,
            notificationData.data as ProjectNotificationDataDto,
          );
          break;
        case NotificationType.COMMENT_MENTION:
          emailSent = await this.emailService.sendCommentMentionEmail(
            userEmail,
            notificationData.data as CommentNotificationDataDto,
          );
          break;
        case NotificationType.TASK_COMPLETED:
          emailSent = await this.emailService.sendTaskCompletedEmail(
            userEmail,
            notificationData.data as TaskNotificationDataDto,
          );
          break;
        case NotificationType.ACCOUNT_SETTINGS_CHANGED:
          this.logger.log(`Sending email verification to: ${userEmail}`);
          emailSent = await this.emailService.sendAccountSettingsChangedEmail(
            userEmail,
            notificationData.data as any,
          );
          this.logger.log(`Email verification sent successfully: ${emailSent}`);
          break;
        // Add more email types as needed
      }

      if (emailSent) {
        return {
          id: `email_${Date.now()}`,
          ...notificationData,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }

    return null;
  }

  private async sendInAppNotification(
    notificationData: CreateNotificationDto,
  ): Promise<NotificationDto> {
    return this.inAppService.createNotification({
      userId: notificationData.recipientId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      data: notificationData.data,
      priority: notificationData.priority,
    });
  }

  private async sendPushNotification(
    notificationData: CreateNotificationDto,
  ): Promise<NotificationDto | null> {
    // Implement push notification logic here
    // This would integrate with services like Firebase Cloud Messaging, Apple Push Notification Service, etc.
    this.logger.log(
      `Push notification would be sent: ${notificationData.title}`,
    );

    return {
      id: `push_${Date.now()}`,
      ...notificationData,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    type: NotificationType,
    preferences: NotificationPreferencesDto,
  ): NotificationChannel[] {
    return channels.filter((channel) => {
      switch (channel) {
        case NotificationChannel.EMAIL:
          return this.isEmailNotificationEnabled(type, preferences);
        case NotificationChannel.IN_APP:
          return this.isInAppNotificationEnabled(type, preferences);
        case NotificationChannel.PUSH:
          return this.isPushNotificationEnabled(type, preferences);
        default:
          return true;
      }
    });
  }

  private isEmailNotificationEnabled(
    type: NotificationType,
    preferences: NotificationPreferencesDto,
  ): boolean {
    const emailPrefs = preferences.emailNotifications;

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return emailPrefs.taskAssigned;
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
        return emailPrefs.taskDue;
      case NotificationType.TASK_COMPLETED:
        return emailPrefs.taskCompleted;
      case NotificationType.PROJECT_MEMBER_ADDED:
      case NotificationType.PROJECT_UPDATED:
        return emailPrefs.projectUpdates;
      case NotificationType.TEAM_INVITATION:
        return emailPrefs.teamInvitations;
      case NotificationType.COMMENT_MENTION:
        return emailPrefs.mentions;
      case NotificationType.TASK_COMMENT_ADDED:
        return emailPrefs.comments;
      default:
        return true;
    }
  }

  private isInAppNotificationEnabled(
    type: NotificationType,
    preferences: NotificationPreferencesDto,
  ): boolean {
    const inAppPrefs = preferences.inAppNotifications;

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
      case NotificationType.TASK_COMPLETED:
        return inAppPrefs.taskUpdates;
      case NotificationType.PROJECT_MEMBER_ADDED:
      case NotificationType.PROJECT_UPDATED:
        return inAppPrefs.projectUpdates;
      case NotificationType.TEAM_MEMBER_JOINED:
      case NotificationType.TEAM_MEMBER_LEFT:
        return inAppPrefs.teamActivity;
      case NotificationType.COMMENT_MENTION:
        return inAppPrefs.mentions;
      case NotificationType.TASK_COMMENT_ADDED:
        return inAppPrefs.comments;
      default:
        return true;
    }
  }

  private isPushNotificationEnabled(
    type: NotificationType,
    preferences: NotificationPreferencesDto,
  ): boolean {
    const pushPrefs = preferences.pushNotifications;

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return pushPrefs.taskAssigned;
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
        return pushPrefs.taskDue;
      case NotificationType.COMMENT_MENTION:
        return pushPrefs.mentions;
      case NotificationType.TASK_COMMENT_ADDED:
        return pushPrefs.comments;
      default:
        return false;
    }
  }

  private getTaskNotificationTitle(
    type: NotificationType,
    taskData: TaskNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return 'New Task Assigned';
      case NotificationType.TASK_DUE_SOON:
        return 'Task Due Soon';
      case NotificationType.TASK_COMPLETED:
        return 'Task Completed';
      case NotificationType.TASK_OVERDUE:
        return 'Task Overdue';
      default:
        return 'Task Update';
    }
  }

  private getTaskNotificationMessage(
    type: NotificationType,
    taskData: TaskNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return `You have been assigned to "${taskData.taskTitle}" in ${taskData.projectName}`;
      case NotificationType.TASK_DUE_SOON:
        return `"${taskData.taskTitle}" is due soon`;
      case NotificationType.TASK_COMPLETED:
        return `"${taskData.taskTitle}" has been completed`;
      case NotificationType.TASK_OVERDUE:
        return `"${taskData.taskTitle}" is overdue`;
      default:
        return `Task "${taskData.taskTitle}" has been updated`;
    }
  }

  private getProjectNotificationTitle(
    type: NotificationType,
    projectData: ProjectNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.PROJECT_MEMBER_ADDED:
        return 'Added to Project';
      case NotificationType.PROJECT_DEADLINE_APPROACHING:
        return 'Project Deadline Approaching';
      default:
        return 'Project Update';
    }
  }

  private getProjectNotificationMessage(
    type: NotificationType,
    projectData: ProjectNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.PROJECT_MEMBER_ADDED:
        return `You have been added to "${projectData.projectName}"`;
      case NotificationType.PROJECT_DEADLINE_APPROACHING:
        return `"${projectData.projectName}" deadline is approaching`;
      default:
        return `Project "${projectData.projectName}" has been updated`;
    }
  }

  private getCommentNotificationTitle(
    type: NotificationType,
    commentData: CommentNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.COMMENT_MENTION:
        return 'You were mentioned';
      case NotificationType.COMMENT_REPLY:
        return 'Comment Reply';
      default:
        return 'New Comment';
    }
  }

  private getCommentNotificationMessage(
    type: NotificationType,
    commentData: CommentNotificationDataDto,
  ): string {
    switch (type) {
      case NotificationType.COMMENT_MENTION:
        return `${commentData.authorName} mentioned you in a comment`;
      case NotificationType.COMMENT_REPLY:
        return `${commentData.authorName} replied to your comment`;
      default:
        return `${commentData.authorName} added a comment`;
    }
  }

  private getNotificationPriority(
    type: NotificationType,
  ): NotificationPriority {
    const highPriorityTypes = [
      NotificationType.TASK_ASSIGNED,
      NotificationType.TASK_DUE_SOON,
      NotificationType.COMMENT_MENTION,
      NotificationType.PROJECT_DEADLINE_APPROACHING,
    ];

    const urgentTypes = [
      NotificationType.TASK_OVERDUE,
      NotificationType.SYSTEM_MAINTENANCE,
    ];

    if (urgentTypes.includes(type)) {
      return NotificationPriority.URGENT;
    }

    if (highPriorityTypes.includes(type)) {
      return NotificationPriority.HIGH;
    }

    return NotificationPriority.MEDIUM;
  }

  private getDefaultPreferences(userId: string): NotificationPreferencesDto {
    return {
      userId,
      emailNotifications: {
        taskAssigned: true,
        taskDue: true,
        taskCompleted: true,
        projectUpdates: true,
        teamInvitations: true,
        comments: false,
        mentions: true,
        weeklyDigest: true,
      },
      inAppNotifications: {
        taskUpdates: true,
        projectUpdates: true,
        teamActivity: true,
        comments: true,
        mentions: true,
      },
      pushNotifications: {
        taskAssigned: true,
        taskDue: true,
        mentions: true,
        comments: false,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      },
    };
  }
}
