# Notification Module - ClickUp-like Project Management System

This comprehensive notification module provides multi-channel notification capabilities for your project management system, similar to ClickUp's notification system.

## 🚀 Features

### Notification Types
- **Task Notifications**: Assignment, due dates, completion, updates, comments
- **Project Notifications**: Member additions, deadline alerts, updates
- **Team Notifications**: Invitations, member changes, role updates
- **Comment Notifications**: Mentions, replies, reactions
- **System Notifications**: Maintenance, updates, security alerts
- **Workspace Notifications**: Creation, updates, member management
- **Time Tracking**: Time logged, goals reached, reports ready
- **Automation**: Triggered actions, failures

### Notification Channels
- **Email**: Rich HTML templates with professional styling
- **In-App**: Real-time notifications within the application
- **Push**: Mobile and browser push notifications (ready for implementation)
- **SMS**: Text message notifications (ready for implementation)
- **Slack**: Slack integration (ready for implementation)
- **Webhook**: Custom webhook notifications (ready for implementation)

### Advanced Features
- **User Preferences**: Granular control over notification types and channels
- **Quiet Hours**: Respect user's do-not-disturb settings
- **Priority Levels**: Low, Medium, High, Urgent
- **Bulk Notifications**: Send multiple notifications efficiently
- **Template System**: Professional email templates
- **Filtering**: Advanced filtering and pagination
- **Read Status**: Track read/unread notifications
- **Cleanup**: Automatic cleanup of old notifications

## 📡 API Endpoints

### Core Notification Endpoints

#### Send Single Notification
```http
POST /api/v1/notifications
Content-Type: application/json

{
  "type": "task_assigned",
  "title": "New Task Assigned",
  "message": "You have been assigned a new task",
  "recipientId": "user123",
  "senderId": "user456",
  "channels": ["email", "in_app"],
  "priority": "high",
  "data": {
    "taskId": "task123",
    "taskTitle": "Complete project documentation"
  }
}
```

#### Send Bulk Notifications
```http
POST /api/v1/notifications/bulk
Content-Type: application/json

{
  "notifications": [
    {
      "type": "task_assigned",
      "title": "New Task Assigned",
      "message": "You have been assigned a new task",
      "recipientId": "user123",
      "channels": ["email", "in_app"],
      "priority": "high"
    }
  ]
}
```

### Specialized Notification Endpoints

#### Task Notifications
```http
POST /api/v1/notifications/task
Content-Type: application/json

{
  "type": "task_assigned",
  "recipientId": "user123",
  "taskData": {
    "taskId": "task123",
    "taskTitle": "Complete project documentation",
    "taskDescription": "Write comprehensive documentation",
    "taskPriority": "high",
    "taskStatus": "todo",
    "projectId": "proj123",
    "projectName": "InvicTask",
    "assigneeId": "user123",
    "assigneeName": "John Doe",
    "assignerName": "Jane Smith",
    "dueDate": "2024-01-15T10:00:00Z",
    "url": "https://app.invictask.com/tasks/task123"
  }
}
```

#### Project Notifications
```http
POST /api/v1/notifications/project
Content-Type: application/json

{
  "type": "project_member_added",
  "recipientId": "user123",
  "projectData": {
    "projectId": "proj123",
    "projectName": "InvicTask Development",
    "projectDescription": "Building the next-gen project management tool",
    "workspaceId": "ws123",
    "workspaceName": "InvicTask Workspace",
    "ownerId": "user456",
    "ownerName": "Jane Smith",
    "memberRole": "member",
    "deadline": "2024-03-01T00:00:00Z",
    "url": "https://app.invictask.com/projects/proj123"
  }
}
```

#### Comment Notifications
```http
POST /api/v1/notifications/comment
Content-Type: application/json

{
  "type": "comment_mention",
  "recipientId": "user123",
  "commentData": {
    "commentId": "comment123",
    "commentText": "@john.doe please review this task",
    "taskId": "task123",
    "taskTitle": "Complete project documentation",
    "projectId": "proj123",
    "projectName": "InvicTask",
    "authorId": "user456",
    "authorName": "Jane Smith",
    "mentionedUserIds": ["user123"],
    "url": "https://app.invictask.com/tasks/task123#comment123"
  }
}
```

### User Notification Management

#### Get User Notifications
```http
GET /api/v1/notifications/user/user123?unreadOnly=true&limit=20&offset=0
```

#### Get Unread Count
```http
GET /api/v1/notifications/user/user123/unread-count
```

#### Mark as Read
```http
PUT /api/v1/notifications/user/user123/notification/notif123/read
```

#### Mark All as Read
```http
PUT /api/v1/notifications/user/user123/notifications/read-all
```

### User Preferences

#### Get Preferences
```http
GET /api/v1/notifications/user/user123/preferences
```

#### Update Preferences
```http
PUT /api/v1/notifications/user/user123/preferences
Content-Type: application/json

{
  "userId": "user123",
  "emailNotifications": {
    "taskAssigned": true,
    "taskDue": true,
    "taskCompleted": true,
    "projectUpdates": true,
    "teamInvitations": true,
    "comments": false,
    "mentions": true,
    "weeklyDigest": true
  },
  "inAppNotifications": {
    "taskUpdates": true,
    "projectUpdates": true,
    "teamActivity": true,
    "comments": true,
    "mentions": true
  },
  "pushNotifications": {
    "taskAssigned": true,
    "taskDue": true,
    "mentions": true,
    "comments": false
  },
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

## 🧪 Testing Endpoints

The module includes testing endpoints for easy development and debugging:

```http
POST /api/v1/notifications/test/task-assigned
POST /api/v1/notifications/test/task-due
POST /api/v1/notifications/test/project-invitation
POST /api/v1/notifications/test/comment-mention
```

## 💻 Usage in Your Application

### Inject the Service
```typescript
import { NotificationService } from './module/notification';

@Injectable()
export class TaskService {
  constructor(private readonly notificationService: NotificationService) {}

  async assignTask(taskId: string, assigneeId: string, assignerId: string) {
    // Your task assignment logic here
    
    // Send notification
    await this.notificationService.sendTaskNotification(
      NotificationType.TASK_ASSIGNED,
      assigneeId,
      {
        taskId,
        taskTitle: 'Complete project documentation',
        taskPriority: TaskPriority.HIGH,
        taskStatus: TaskStatus.TODO,
        projectId: 'proj123',
        projectName: 'InvicTask',
        assigneeId,
        assigneeName: 'John Doe',
        assignerName: 'Jane Smith',
        dueDate: new Date('2024-01-15'),
        url: `https://app.invictask.com/tasks/${taskId}`,
      },
      assignerId
    );
  }
}
```

### Send Custom Notifications
```typescript
await this.notificationService.sendNotification({
  type: NotificationType.CUSTOM,
  title: 'Custom Notification',
  message: 'This is a custom notification',
  recipientId: 'user123',
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  priority: NotificationPriority.MEDIUM,
  data: { customField: 'customValue' },
});
```

## 📧 Email Templates

The module includes professional email templates for:
- Task assignments
- Due date reminders
- Project invitations
- Comment mentions
- Task completions
- And more...

Each template is responsive and includes:
- Professional styling
- Priority-based color coding
- Action buttons
- Company branding
- Mobile-friendly design

## 🔧 Configuration

### Environment Variables
```env
# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM="InvicTask" <your-email@gmail.com>
```

### Customization
- **Email Templates**: Modify templates in `email.service.ts`
- **Notification Types**: Add new types in `notification.enum.ts`
- **Channels**: Implement additional channels in `notification.service.ts`
- **Preferences**: Extend user preferences in `notification.dto.ts`

## 🚀 Production Considerations

1. **Database Integration**: Replace in-memory storage with a proper database
2. **Queue System**: Implement Redis/Bull for background processing
3. **Rate Limiting**: Add rate limiting for notification endpoints
4. **Monitoring**: Add metrics and monitoring for notification delivery
5. **Scaling**: Consider microservices for high-volume notifications
6. **Security**: Add authentication and authorization
7. **Webhooks**: Implement webhook delivery with retry logic
8. **Push Notifications**: Integrate with FCM/APNS for mobile push

## 📊 Notification Types Reference

### Task Notifications
- `task_created` - New task created
- `task_assigned` - Task assigned to user
- `task_updated` - Task details updated
- `task_completed` - Task marked as complete
- `task_deleted` - Task deleted
- `task_due_soon` - Task due date approaching
- `task_overdue` - Task past due date
- `task_priority_changed` - Task priority updated
- `task_status_changed` - Task status updated
- `task_comment_added` - New comment on task
- `task_attachment_added` - File attached to task

### Project Notifications
- `project_created` - New project created
- `project_updated` - Project details updated
- `project_deleted` - Project deleted
- `project_member_added` - User added to project
- `project_member_removed` - User removed from project
- `project_role_changed` - User role changed
- `project_deadline_approaching` - Project deadline near

### Team Notifications
- `team_invitation` - Invited to join team
- `team_member_joined` - New member joined
- `team_member_left` - Member left team
- `team_role_updated` - Member role updated

### Comment Notifications
- `comment_mention` - User mentioned in comment
- `comment_reply` - Reply to user's comment
- `comment_reaction` - Reaction to user's comment

This notification system provides a solid foundation for a ClickUp-like project management application with comprehensive notification capabilities!
