import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  NotificationType,
  TaskPriority,
  TaskStatus,
  ProjectRole,
  NotificationChannel,
  NotificationPriority,
} from '../../../modules/notification/enums/notification.enum';

/**
 * Example service showing how to integrate notifications into your application
 */
@Injectable()
export class NotificationExamplesService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Example: Send notification when a task is assigned
   */
  async onTaskAssigned(taskId: string, assigneeId: string, assignerId: string) {
    await this.notificationService.sendTaskNotification(
      NotificationType.TASK_ASSIGNED,
      assigneeId,
      {
        taskId,
        taskTitle: 'Implement user authentication',
        taskDescription: 'Add JWT-based authentication to the API',
        taskPriority: TaskPriority.HIGH,
        taskStatus: TaskStatus.TODO,
        projectId: 'proj_123',
        projectName: 'InvicTask Backend',
        assigneeId,
        assigneeName: 'John Doe',
        assignerName: 'Jane Smith',
        dueDate: new Date('2024-01-20'),
        url: `https://app.invictask.com/tasks/${taskId}`,
      },
      assignerId,
    );
  }

  /**
   * Example: Send notification when a task is due soon
   */
  async onTaskDueSoon(taskId: string, assigneeId: string) {
    await this.notificationService.sendTaskNotification(
      NotificationType.TASK_DUE_SOON,
      assigneeId,
      {
        taskId,
        taskTitle: 'Implement user authentication',
        taskPriority: TaskPriority.HIGH,
        taskStatus: TaskStatus.IN_PROGRESS,
        projectId: 'proj_123',
        projectName: 'InvicTask Backend',
        assigneeId,
        assigneeName: 'John Doe',
        dueDate: new Date('2024-01-20'),
        url: `https://app.invictask.com/tasks/${taskId}`,
      },
    );
  }

  /**
   * Example: Send notification when a user is added to a project
   */
  async onProjectMemberAdded(
    projectId: string,
    newMemberId: string,
    addedById: string,
  ) {
    await this.notificationService.sendProjectNotification(
      NotificationType.PROJECT_MEMBER_ADDED,
      newMemberId,
      {
        projectId,
        projectName: 'InvicTask Backend Development',
        projectDescription: 'Building the backend API for InvicTask',
        workspaceId: 'ws_123',
        workspaceName: 'InvicTask Workspace',
        ownerId: addedById,
        ownerName: 'Jane Smith',
        memberRole: ProjectRole.MEMBER,
        deadline: new Date('2024-03-01'),
        url: `https://app.invictask.com/projects/${projectId}`,
      },
      addedById,
    );
  }

  /**
   * Example: Send notification when someone mentions a user in a comment
   */
  async onCommentMention(
    commentId: string,
    mentionedUserId: string,
    authorId: string,
  ) {
    await this.notificationService.sendCommentNotification(
      NotificationType.COMMENT_MENTION,
      mentionedUserId,
      {
        commentId,
        commentText: '@john.doe can you please review this implementation?',
        taskId: 'task_123',
        taskTitle: 'Implement user authentication',
        projectId: 'proj_123',
        projectName: 'InvicTask Backend',
        authorId,
        authorName: 'Jane Smith',
        mentionedUserIds: [mentionedUserId],
        url: `https://app.invictask.com/tasks/task_123#comment_${commentId}`,
      },
      authorId,
    );
  }

  /**
   * Example: Send bulk notifications to multiple team members
   */
  async onProjectDeadlineApproaching(projectId: string, memberIds: string[]) {
    const notifications = memberIds.map((memberId) => ({
      type: NotificationType.PROJECT_DEADLINE_APPROACHING,
      title: 'Project Deadline Approaching',
      message: 'InvicTask Backend project deadline is in 3 days',
      recipientId: memberId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      data: {
        projectId,
        projectName: 'InvicTask Backend',
        deadline: new Date('2024-03-01'),
        url: `https://app.invictask.com/projects/${projectId}`,
      },
    }));

    await this.notificationService.sendBulkNotifications({
      notifications,
      batchId: `project_deadline_${projectId}_${Date.now()}`,
    });
  }

  /**
   * Example: Send weekly digest notification
   */
  async sendWeeklyDigest(userId: string) {
    const weeklyData = {
      tasksCompleted: 12,
      tasksAssigned: 5,
      projectsUpdated: 3,
      commentsReceived: 8,
      weekStartDate: new Date('2024-01-15'),
      weekEndDate: new Date('2024-01-21'),
    };

    await this.notificationService.sendNotification({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Your Weekly Summary',
      message: `You completed ${weeklyData.tasksCompleted} tasks this week!`,
      recipientId: userId,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.LOW,
      data: weeklyData,
    });
  }

  /**
   * Example: Send system maintenance notification
   */
  async sendMaintenanceNotification(userIds: string[]) {
    const notifications = userIds.map((userId) => ({
      type: NotificationType.SYSTEM_MAINTENANCE,
      title: 'Scheduled Maintenance',
      message:
        'InvicTask will be under maintenance on Jan 25, 2024 from 2:00 AM to 4:00 AM UTC',
      recipientId: userId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.URGENT,
      data: {
        maintenanceStart: new Date('2024-01-25T02:00:00Z'),
        maintenanceEnd: new Date('2024-01-25T04:00:00Z'),
        affectedServices: ['API', 'Web App', 'Mobile App'],
      },
    }));

    await this.notificationService.sendBulkNotifications({
      notifications,
      batchId: `maintenance_${Date.now()}`,
    });
  }

  /**
   * Example: Update user notification preferences
   */
  async updateUserNotificationPreferences(userId: string) {
    await this.notificationService.updateUserPreferences(userId, {
      userId,
      emailNotifications: {
        taskAssigned: true,
        taskDue: true,
        taskCompleted: false,
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
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
      },
    });
  }

  /**
   * Example: Get user's unread notifications
   */
  async getUserDashboardData(userId: string) {
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    const recentNotifications =
      await this.notificationService.getUserNotifications(userId, {
        limit: 10,
        unreadOnly: false,
      });

    return {
      unreadCount,
      recentNotifications,
    };
  }

  /**
   * Example: Mark notifications as read when user views them
   */
  async onUserViewsNotifications(userId: string, notificationIds: string[]) {
    for (const notificationId of notificationIds) {
      await this.notificationService.markNotificationAsRead(
        userId,
        notificationId,
      );
    }
  }

  /**
   * Example: Integration with task completion
   */
  async onTaskCompleted(
    taskId: string,
    completedById: string,
    projectOwnerId: string,
  ) {
    // Notify the project owner
    await this.notificationService.sendTaskNotification(
      NotificationType.TASK_COMPLETED,
      projectOwnerId,
      {
        taskId,
        taskTitle: 'Implement user authentication',
        taskPriority: TaskPriority.HIGH,
        taskStatus: TaskStatus.DONE,
        projectId: 'proj_123',
        projectName: 'InvicTask Backend',
        assigneeId: completedById,
        assigneeName: 'John Doe',
        completedAt: new Date(),
        url: `https://app.invictask.com/tasks/${taskId}`,
      },
      completedById,
    );
  }
}
