import { Injectable, Logger } from '@nestjs/common';
import {
  InAppNotificationDto,
  NotificationDto,
  NotificationFilterDto,
} from '../dto/notification.dto';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
} from '../enums/notification.enum';

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  // In a real application, this would be stored in a database
  private notifications: Map<string, NotificationDto[]> = new Map();
  private notificationCounter = 0;

  async createNotification(
    notificationData: InAppNotificationDto,
  ): Promise<NotificationDto> {
    const notification: NotificationDto = {
      id: this.generateId(),
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      recipientId: notificationData.userId,
      channels: [NotificationChannel.IN_APP],
      priority: notificationData.priority,
      status: NotificationStatus.SENT,
      data: {
        ...notificationData.data,
        actionUrl: notificationData.actionUrl,
        iconUrl: notificationData.iconUrl,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store notification for user
    const userNotifications =
      this.notifications.get(notificationData.userId) || [];
    userNotifications.unshift(notification); // Add to beginning
    this.notifications.set(notificationData.userId, userNotifications);

    this.logger.log(
      `In-app notification created for user ${notificationData.userId}: ${notification.id}`,
    );
    return notification;
  }

  async getUserNotifications(
    userId: string,
    filter?: NotificationFilterDto,
  ): Promise<NotificationDto[]> {
    let userNotifications = this.notifications.get(userId) || [];

    // Apply filters
    if (filter) {
      if (filter.unreadOnly) {
        userNotifications = userNotifications.filter((n) => !n.readAt);
      }
      if (filter.type) {
        userNotifications = userNotifications.filter(
          (n) => n.type === filter.type,
        );
      }
      if (filter.priority) {
        userNotifications = userNotifications.filter(
          (n) => n.priority === filter.priority,
        );
      }
      if (filter.startDate) {
        userNotifications = userNotifications.filter(
          (n) => n.createdAt >= filter.startDate!,
        );
      }
      if (filter.endDate) {
        userNotifications = userNotifications.filter(
          (n) => n.createdAt <= filter.endDate!,
        );
      }
    }

    // Apply pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    return userNotifications.slice(offset, offset + limit);
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find((n) => n.id === notificationId);

    if (notification) {
      notification.readAt = new Date();
      notification.updatedAt = new Date();
      notification.status = NotificationStatus.READ;
      this.logger.log(
        `Notification ${notificationId} marked as read for user ${userId}`,
      );
      return true;
    }

    return false;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) || [];
    let markedCount = 0;

    userNotifications.forEach((notification) => {
      if (!notification.readAt) {
        notification.readAt = new Date();
        notification.updatedAt = new Date();
        notification.status = NotificationStatus.READ;
        markedCount++;
      }
    });

    this.logger.log(
      `${markedCount} notifications marked as read for user ${userId}`,
    );
    return markedCount;
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex((n) => n.id === notificationId);

    if (index !== -1) {
      userNotifications.splice(index, 1);
      this.notifications.set(userId, userNotifications);
      this.logger.log(
        `Notification ${notificationId} deleted for user ${userId}`,
      );
      return true;
    }

    return false;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter((n) => !n.readAt).length;
  }

  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto | null> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.find((n) => n.id === notificationId) || null;
  }

  async createTaskNotification(
    userId: string,
    type: NotificationType,
    taskData: any,
  ): Promise<NotificationDto> {
    let title = '';
    let message = '';
    let iconUrl = '';

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        title = 'New Task Assigned';
        message = `You have been assigned to "${taskData.taskTitle}" in ${taskData.projectName}`;
        iconUrl = '/icons/task-assigned.svg';
        break;
      case NotificationType.TASK_DUE_SOON:
        title = 'Task Due Soon';
        message = `"${taskData.taskTitle}" is due soon`;
        iconUrl = '/icons/task-due.svg';
        break;
      case NotificationType.TASK_COMPLETED:
        title = 'Task Completed';
        message = `"${taskData.taskTitle}" has been completed`;
        iconUrl = '/icons/task-completed.svg';
        break;
      case NotificationType.TASK_COMMENT_ADDED:
        title = 'New Comment';
        message = `${taskData.authorName} commented on "${taskData.taskTitle}"`;
        iconUrl = '/icons/comment.svg';
        break;
      default:
        title = 'Task Update';
        message = `Task "${taskData.taskTitle}" has been updated`;
        iconUrl = '/icons/task-update.svg';
    }

    return this.createNotification({
      userId,
      title,
      message,
      type,
      data: taskData,
      actionUrl: taskData.url,
      iconUrl,
      priority: this.getNotificationPriority(type),
    });
  }

  async createProjectNotification(
    userId: string,
    type: NotificationType,
    projectData: any,
  ): Promise<NotificationDto> {
    let title = '';
    let message = '';
    let iconUrl = '';

    switch (type) {
      case NotificationType.PROJECT_MEMBER_ADDED:
        title = 'Added to Project';
        message = `You have been added to "${projectData.projectName}"`;
        iconUrl = '/icons/project-invite.svg';
        break;
      case NotificationType.PROJECT_DEADLINE_APPROACHING:
        title = 'Project Deadline Approaching';
        message = `"${projectData.projectName}" deadline is approaching`;
        iconUrl = '/icons/project-deadline.svg';
        break;
      case NotificationType.PROJECT_UPDATED:
        title = 'Project Updated';
        message = `"${projectData.projectName}" has been updated`;
        iconUrl = '/icons/project-update.svg';
        break;
      default:
        title = 'Project Notification';
        message = `Update for project "${projectData.projectName}"`;
        iconUrl = '/icons/project.svg';
    }

    return this.createNotification({
      userId,
      title,
      message,
      type,
      data: projectData,
      actionUrl: projectData.url,
      iconUrl,
      priority: this.getNotificationPriority(type),
    });
  }

  async createCommentNotification(
    userId: string,
    type: NotificationType,
    commentData: any,
  ): Promise<NotificationDto> {
    let title = '';
    let message = '';

    switch (type) {
      case NotificationType.COMMENT_MENTION:
        title = 'You were mentioned';
        message = `${commentData.authorName} mentioned you in a comment`;
        break;
      case NotificationType.COMMENT_REPLY:
        title = 'Comment Reply';
        message = `${commentData.authorName} replied to your comment`;
        break;
      default:
        title = 'New Comment';
        message = `${commentData.authorName} added a comment`;
    }

    return this.createNotification({
      userId,
      title,
      message,
      type,
      data: commentData,
      actionUrl: commentData.url,
      iconUrl: '/icons/comment.svg',
      priority:
        type === NotificationType.COMMENT_MENTION
          ? NotificationPriority.HIGH
          : NotificationPriority.MEDIUM,
    });
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

  private generateId(): string {
    return `notif_${Date.now()}_${++this.notificationCounter}`;
  }

  // Utility method to clean up old notifications (could be run as a cron job)
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let totalCleaned = 0;

    for (const [userId, notifications] of this.notifications.entries()) {
      const originalLength = notifications.length;
      const filteredNotifications = notifications.filter(
        (n) => n.createdAt > cutoffDate || !n.readAt,
      );

      this.notifications.set(userId, filteredNotifications);
      totalCleaned += originalLength - filteredNotifications.length;
    }

    this.logger.log(`Cleaned up ${totalCleaned} old notifications`);
    return totalCleaned;
  }
}
