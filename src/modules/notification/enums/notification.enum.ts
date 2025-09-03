// Notification Types for ClickUp-like Project Management System
export enum NotificationType {
  // Task Related
  TASK_CREATED = 'task_created',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DELETED = 'task_deleted',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_PRIORITY_CHANGED = 'task_priority_changed',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_COMMENT_ADDED = 'task_comment_added',
  TASK_ATTACHMENT_ADDED = 'task_attachment_added',
  TASK_DEPENDENCY_ADDED = 'task_dependency_added',
  TASK_DEPENDENCY_COMPLETED = 'task_dependency_completed',

  // Project Related
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  PROJECT_ROLE_CHANGED = 'project_role_changed',
  PROJECT_DEADLINE_APPROACHING = 'project_deadline_approaching',

  // Team Related
  TEAM_INVITATION = 'team_invitation',
  TEAM_MEMBER_JOINED = 'team_member_joined',
  TEAM_MEMBER_LEFT = 'team_member_left',
  TEAM_ROLE_UPDATED = 'team_role_updated',

  // Comment Related
  COMMENT_MENTION = 'comment_mention',
  COMMENT_REPLY = 'comment_reply',
  COMMENT_REACTION = 'comment_reaction',

  // System Related
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_UPDATE = 'system_update',
  ACCOUNT_SECURITY = 'account_security',
  ACCOUNT_SETTINGS_CHANGED = 'account_settings_changed',
  EMAIL_VERIFICATION_SUCCESS = 'email_verification_success',

  // Workspace Related
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_UPDATED = 'workspace_updated',
  WORKSPACE_MEMBER_ADDED = 'workspace_member_added',
  WORKSPACE_MEMBER_REMOVED = 'workspace_member_removed',

  // Time Tracking
  TIME_TRACKED = 'time_tracked',
  TIME_GOAL_REACHED = 'time_goal_reached',
  TIME_REPORT_READY = 'time_report_ready',

  // Custom Fields
  CUSTOM_FIELD_UPDATED = 'custom_field_updated',

  // Automation
  AUTOMATION_TRIGGERED = 'automation_triggered',
  AUTOMATION_FAILED = 'automation_failed',
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
  ARCHIVED = 'archived',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

export enum EmailTemplate {
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_REMINDER = 'task_due_reminder',
  PROJECT_INVITATION = 'project_invitation',
  TEAM_INVITATION = 'team_invitation',
  WEEKLY_SUMMARY = 'weekly_summary',
  COMMENT_MENTION = 'comment_mention',
  TASK_COMPLETED = 'task_completed',
  PROJECT_DEADLINE = 'project_deadline',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
}
