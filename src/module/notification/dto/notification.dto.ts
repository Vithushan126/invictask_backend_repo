import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  TaskPriority,
  TaskStatus,
  ProjectRole,
  EmailTemplate,
} from '../enums/notification.enum';

export class CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  data?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export class NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailNotificationDto {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: EmailTemplate;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  attachments?: EmailAttachmentDto[];
  priority?: NotificationPriority;
  scheduledAt?: Date;
}

export class EmailAttachmentDto {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  cid?: string;
}

export class InAppNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  actionUrl?: string;
  iconUrl?: string;
  priority: NotificationPriority;
}

export class PushNotificationDto {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  clickAction?: string;
  icon?: string;
  image?: string;
}

export class TaskNotificationDataDto {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  taskPriority: TaskPriority;
  taskStatus: TaskStatus;
  projectId: string;
  projectName: string;
  assigneeId?: string;
  assigneeName?: string;
  assignerName?: string;
  dueDate?: Date;
  completedAt?: Date;
  url?: string;
}

export class ProjectNotificationDataDto {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  ownerName: string;
  memberRole?: ProjectRole;
  deadline?: Date;
  url?: string;
}

export class CommentNotificationDataDto {
  commentId: string;
  commentText: string;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  authorId: string;
  authorName: string;
  mentionedUserIds?: string[];
  url?: string;
}

export class NotificationPreferencesDto {
  userId: string;
  emailNotifications: {
    taskAssigned: boolean;
    taskDue: boolean;
    taskCompleted: boolean;
    projectUpdates: boolean;
    teamInvitations: boolean;
    comments: boolean;
    mentions: boolean;
    weeklyDigest: boolean;
  };
  inAppNotifications: {
    taskUpdates: boolean;
    projectUpdates: boolean;
    teamActivity: boolean;
    comments: boolean;
    mentions: boolean;
  };
  pushNotifications: {
    taskAssigned: boolean;
    taskDue: boolean;
    mentions: boolean;
    comments: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: string;
  };
}

export class NotificationResponseDto {
  success: boolean;
  message: string;
  data?: NotificationDto | NotificationDto[];
  error?: string;
}

export class BulkNotificationDto {
  notifications: CreateNotificationDto[];
  batchId?: string;
}

export class NotificationStatsDto {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalRead: number;
  byChannel: Record<NotificationChannel, number>;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export class NotificationFilterDto {
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}
