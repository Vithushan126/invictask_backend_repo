import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { MailConfig } from '../config/mail.config';
import { 
  EmailNotificationDto, 
  TaskNotificationDataDto, 
  ProjectNotificationDataDto,
  CommentNotificationDataDto 
} from '../dto/notification.dto';
import { EmailTemplate } from '../enums/notification.enum';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailConfig: MailConfig) {}

  async sendEmail(emailData: EmailNotificationDto): Promise<boolean> {
    try {
      const transporter = this.mailConfig.getTransporter();
      
      const mailOptions = {
        from: this.mailConfig.getFromAddress(),
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.htmlContent,
        text: emailData.textContent,
        attachments: emailData.attachments,
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendTaskAssignedEmail(
    recipientEmail: string, 
    taskData: TaskNotificationDataDto
  ): Promise<boolean> {
    const htmlContent = this.generateTaskAssignedTemplate(taskData);
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `New Task Assigned: ${taskData.taskTitle}`,
      htmlContent,
      template: EmailTemplate.TASK_ASSIGNED,
      templateData: taskData,
    });
  }

  async sendTaskDueReminderEmail(
    recipientEmail: string, 
    taskData: TaskNotificationDataDto
  ): Promise<boolean> {
    const htmlContent = this.generateTaskDueReminderTemplate(taskData);
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `Task Due Soon: ${taskData.taskTitle}`,
      htmlContent,
      template: EmailTemplate.TASK_DUE_REMINDER,
      templateData: taskData,
    });
  }

  async sendProjectInvitationEmail(
    recipientEmail: string, 
    projectData: ProjectNotificationDataDto
  ): Promise<boolean> {
    const htmlContent = this.generateProjectInvitationTemplate(projectData);
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `You've been invited to join ${projectData.projectName}`,
      htmlContent,
      template: EmailTemplate.PROJECT_INVITATION,
      templateData: projectData,
    });
  }

  async sendCommentMentionEmail(
    recipientEmail: string, 
    commentData: CommentNotificationDataDto
  ): Promise<boolean> {
    const htmlContent = this.generateCommentMentionTemplate(commentData);
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `You were mentioned in a comment`,
      htmlContent,
      template: EmailTemplate.COMMENT_MENTION,
      templateData: commentData,
    });
  }

  async sendTaskCompletedEmail(
    recipientEmail: string, 
    taskData: TaskNotificationDataDto
  ): Promise<boolean> {
    const htmlContent = this.generateTaskCompletedTemplate(taskData);
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `Task Completed: ${taskData.taskTitle}`,
      htmlContent,
      template: EmailTemplate.TASK_COMPLETED,
      templateData: taskData,
    });
  }

  private generateTaskAssignedTemplate(taskData: TaskNotificationDataDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Task Assigned</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .task-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .priority-${taskData.taskPriority} { border-left: 4px solid ${this.getPriorityColor(taskData.taskPriority)}; }
          .button { display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been assigned a new task by <strong>${taskData.assignerName}</strong>.</p>
            
            <div class="task-details priority-${taskData.taskPriority}">
              <h3>${taskData.taskTitle}</h3>
              <p><strong>Project:</strong> ${taskData.projectName}</p>
              <p><strong>Priority:</strong> ${taskData.taskPriority.toUpperCase()}</p>
              <p><strong>Status:</strong> ${taskData.taskStatus.replace('_', ' ').toUpperCase()}</p>
              ${taskData.dueDate ? `<p><strong>Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>` : ''}
              ${taskData.taskDescription ? `<p><strong>Description:</strong> ${taskData.taskDescription}</p>` : ''}
            </div>
            
            ${taskData.url ? `<p><a href="${taskData.url}" class="button">View Task</a></p>` : ''}
            
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from InvicTask. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTaskDueReminderTemplate(taskData: TaskNotificationDataDto): string {
    const daysUntilDue = taskData.dueDate ? 
      Math.ceil((new Date(taskData.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Task Due Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .task-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; padding: 10px 20px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .urgent { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Task Due Reminder</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p class="${daysUntilDue <= 1 ? 'urgent' : ''}">
              Your task is due ${daysUntilDue <= 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}!
            </p>
            
            <div class="task-details">
              <h3>${taskData.taskTitle}</h3>
              <p><strong>Project:</strong> ${taskData.projectName}</p>
              <p><strong>Due Date:</strong> ${taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Priority:</strong> ${taskData.taskPriority.toUpperCase()}</p>
              <p><strong>Status:</strong> ${taskData.taskStatus.replace('_', ' ').toUpperCase()}</p>
            </div>
            
            ${taskData.url ? `<p><a href="${taskData.url}" class="button">Complete Task</a></p>` : ''}
            
            <p>Don't let your team down - complete this task on time!</p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateProjectInvitationTemplate(projectData: ProjectNotificationDataDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Project Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .project-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Project Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You've been invited to join a project by <strong>${projectData.ownerName}</strong>!</p>
            
            <div class="project-details">
              <h3>${projectData.projectName}</h3>
              <p><strong>Workspace:</strong> ${projectData.workspaceName}</p>
              <p><strong>Your Role:</strong> ${projectData.memberRole?.toUpperCase() || 'MEMBER'}</p>
              ${projectData.projectDescription ? `<p><strong>Description:</strong> ${projectData.projectDescription}</p>` : ''}
              ${projectData.deadline ? `<p><strong>Deadline:</strong> ${new Date(projectData.deadline).toLocaleDateString()}</p>` : ''}
            </div>
            
            ${projectData.url ? `<p><a href="${projectData.url}" class="button">Join Project</a></p>` : ''}
            
            <p>We're excited to have you on board!</p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This invitation was sent by ${projectData.ownerName} via InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCommentMentionTemplate(commentData: CommentNotificationDataDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You were mentioned</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .comment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #8b5cf6; }
          .button { display: inline-block; padding: 10px 20px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .comment-text { background: #f3f4f6; padding: 10px; border-radius: 3px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 You were mentioned</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${commentData.authorName}</strong> mentioned you in a comment.</p>
            
            <div class="comment-details">
              ${commentData.taskTitle ? `<h3>Task: ${commentData.taskTitle}</h3>` : ''}
              ${commentData.projectName ? `<p><strong>Project:</strong> ${commentData.projectName}</p>` : ''}
              <p><strong>Comment by:</strong> ${commentData.authorName}</p>
              <div class="comment-text">
                "${commentData.commentText}"
              </div>
            </div>
            
            ${commentData.url ? `<p><a href="${commentData.url}" class="button">View Comment</a></p>` : ''}
            
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This notification was triggered by a mention in InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTaskCompletedTemplate(taskData: TaskNotificationDataDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Task Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .task-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #059669; }
          .button { display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Task Completed</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Great news! A task has been completed${taskData.assigneeName ? ` by <strong>${taskData.assigneeName}</strong>` : ''}.</p>
            
            <div class="task-details">
              <h3>${taskData.taskTitle}</h3>
              <p><strong>Project:</strong> ${taskData.projectName}</p>
              <p><strong>Completed by:</strong> ${taskData.assigneeName || 'Unknown'}</p>
              <p><strong>Completed on:</strong> ${taskData.completedAt ? new Date(taskData.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              ${taskData.dueDate ? `<p><strong>Original Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
            
            ${taskData.url ? `<p><a href="${taskData.url}" class="button">View Task</a></p>` : ''}
            
            <p>Keep up the great work!</p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'normal': return '#10b981';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  }
}
