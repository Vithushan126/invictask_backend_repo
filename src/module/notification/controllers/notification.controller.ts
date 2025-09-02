import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  TaskNotificationDataDto,
  ProjectNotificationDataDto,
  CommentNotificationDataDto,
  NotificationPreferencesDto,
  BulkNotificationDto,
  NotificationFilterDto,
} from '../dto/notification.dto';
import { NotificationType } from '../enums/notification.enum';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      const notifications = await this.notificationService.sendNotification(createNotificationDto);
      
      return {
        success: true,
        message: 'Notification sent successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send notification',
        error: error.message,
      };
    }
  }

  @Post('bulk')
  async createBulkNotifications(
    @Body() bulkNotificationDto: BulkNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      const notifications = await this.notificationService.sendBulkNotifications(bulkNotificationDto);
      
      return {
        success: true,
        message: `${notifications.length} notifications sent successfully`,
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send bulk notifications',
        error: error.message,
      };
    }
  }

  @Post('task')
  async sendTaskNotification(
    @Body() body: {
      type: NotificationType;
      recipientId: string;
      taskData: TaskNotificationDataDto;
      senderId?: string;
    },
  ): Promise<NotificationResponseDto> {
    try {
      const notifications = await this.notificationService.sendTaskNotification(
        body.type,
        body.recipientId,
        body.taskData,
        body.senderId,
      );
      
      return {
        success: true,
        message: 'Task notification sent successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send task notification',
        error: error.message,
      };
    }
  }

  @Post('project')
  async sendProjectNotification(
    @Body() body: {
      type: NotificationType;
      recipientId: string;
      projectData: ProjectNotificationDataDto;
      senderId?: string;
    },
  ): Promise<NotificationResponseDto> {
    try {
      const notifications = await this.notificationService.sendProjectNotification(
        body.type,
        body.recipientId,
        body.projectData,
        body.senderId,
      );
      
      return {
        success: true,
        message: 'Project notification sent successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send project notification',
        error: error.message,
      };
    }
  }

  @Post('comment')
  async sendCommentNotification(
    @Body() body: {
      type: NotificationType;
      recipientId: string;
      commentData: CommentNotificationDataDto;
      senderId?: string;
    },
  ): Promise<NotificationResponseDto> {
    try {
      const notifications = await this.notificationService.sendCommentNotification(
        body.type,
        body.recipientId,
        body.commentData,
        body.senderId,
      );
      
      return {
        success: true,
        message: 'Comment notification sent successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send comment notification',
        error: error.message,
      };
    }
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('type') type?: NotificationType,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<NotificationResponseDto> {
    try {
      const filter: NotificationFilterDto = {
        type,
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      };

      const notifications = await this.notificationService.getUserNotifications(userId, filter);
      
      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve notifications',
        error: error.message,
      };
    }
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put('user/:userId/notification/:notificationId/read')
  async markAsRead(
    @Param('userId') userId: string,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationResponseDto> {
    try {
      const success = await this.notificationService.markNotificationAsRead(userId, notificationId);
      
      return {
        success,
        message: success ? 'Notification marked as read' : 'Notification not found',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
      };
    }
  }

  @Put('user/:userId/notifications/read-all')
  async markAllAsRead(@Param('userId') userId: string): Promise<NotificationResponseDto> {
    try {
      const count = await this.notificationService.markAllNotificationsAsRead(userId);
      
      return {
        success: true,
        message: `${count} notifications marked as read`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message,
      };
    }
  }

  @Get('user/:userId/preferences')
  async getUserPreferences(@Param('userId') userId: string): Promise<NotificationPreferencesDto> {
    return this.notificationService.getUserPreferences(userId);
  }

  @Put('user/:userId/preferences')
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() preferences: NotificationPreferencesDto,
  ): Promise<NotificationResponseDto> {
    try {
      await this.notificationService.updateUserPreferences(userId, preferences);
      
      return {
        success: true,
        message: 'Notification preferences updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update notification preferences',
        error: error.message,
      };
    }
  }

  // Utility endpoints for testing
  @Post('test/task-assigned')
  async testTaskAssigned(
    @Body() body: { recipientId: string; taskData: TaskNotificationDataDto },
  ): Promise<NotificationResponseDto> {
    return this.sendTaskNotification({
      type: NotificationType.TASK_ASSIGNED,
      recipientId: body.recipientId,
      taskData: body.taskData,
    });
  }

  @Post('test/task-due')
  async testTaskDue(
    @Body() body: { recipientId: string; taskData: TaskNotificationDataDto },
  ): Promise<NotificationResponseDto> {
    return this.sendTaskNotification({
      type: NotificationType.TASK_DUE_SOON,
      recipientId: body.recipientId,
      taskData: body.taskData,
    });
  }

  @Post('test/project-invitation')
  async testProjectInvitation(
    @Body() body: { recipientId: string; projectData: ProjectNotificationDataDto },
  ): Promise<NotificationResponseDto> {
    return this.sendProjectNotification({
      type: NotificationType.PROJECT_MEMBER_ADDED,
      recipientId: body.recipientId,
      projectData: body.projectData,
    });
  }

  @Post('test/comment-mention')
  async testCommentMention(
    @Body() body: { recipientId: string; commentData: CommentNotificationDataDto },
  ): Promise<NotificationResponseDto> {
    return this.sendCommentNotification({
      type: NotificationType.COMMENT_MENTION,
      recipientId: body.recipientId,
      commentData: body.commentData,
    });
  }
}
