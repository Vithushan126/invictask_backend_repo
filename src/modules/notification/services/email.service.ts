import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { MailConfig } from '../config/mail.config';
import {
  EmailNotificationDto,
  TaskNotificationDataDto,
  ProjectNotificationDataDto,
  CommentNotificationDataDto,
} from '../dto/notification.dto';
import { EmailTemplate } from '../enums/notification.enum';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailConfig: MailConfig) {}

  async sendEmail(emailData: EmailNotificationDto): Promise<boolean> {
    try {
      // Check if we're in development mode and email credentials are not configured
      if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        this.logger.warn(
          'Email credentials not configured. Simulating email send in development mode.',
        );
        this.logger.log(`[SIMULATED EMAIL] To: ${emailData.to}`);
        this.logger.log(`[SIMULATED EMAIL] Subject: ${emailData.subject}`);
        this.logger.log(
          `[SIMULATED EMAIL] Content: ${emailData.textContent?.substring(0, 100)}...`,
        );
        return true;
      }

      const transporter = this.mailConfig.getTransporter();

      // Verify connection before sending
      const isConnected = await this.mailConfig.verifyConnection();
      if (!isConnected) {
        this.logger.warn(
          'Email server connection failed. Simulating email send.',
        );
        this.logger.log(`[SIMULATED EMAIL] To: ${emailData.to}`);
        this.logger.log(`[SIMULATED EMAIL] Subject: ${emailData.subject}`);
        return true;
      }

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
      // In development, don't throw error - just log and return false
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          'Email sending failed in development mode. Continuing...',
        );
        return false;
      }
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendTaskAssignedEmail(
    recipientEmail: string,
    taskData: TaskNotificationDataDto,
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
    taskData: TaskNotificationDataDto,
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
    projectData: ProjectNotificationDataDto,
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
    commentData: CommentNotificationDataDto,
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
    taskData: TaskNotificationDataDto,
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

  private generateTaskAssignedTemplate(
    taskData: TaskNotificationDataDto,
  ): string {
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

  private generateTaskDueReminderTemplate(
    taskData: TaskNotificationDataDto,
  ): string {
    const daysUntilDue = taskData.dueDate
      ? Math.ceil(
          (new Date(taskData.dueDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

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

  private generateProjectInvitationTemplate(
    projectData: ProjectNotificationDataDto,
  ): string {
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

  private generateCommentMentionTemplate(
    commentData: CommentNotificationDataDto,
  ): string {
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

  private generateTaskCompletedTemplate(
    taskData: TaskNotificationDataDto,
  ): string {
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

  async sendAccountSettingsChangedEmail(
    recipientEmail: string,
    verificationData: any,
  ): Promise<boolean> {
    const htmlContent =
      this.generateEmailVerificationTemplate(verificationData);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: 'Welcome to InvicTask! Verify Your Email',
      htmlContent,
      textContent: `Welcome to InvicTask! Please verify your email address by clicking the link: ${verificationData.verificationUrl}`,
    };

    return this.sendEmail(emailData);
  }

  async sendWelcomeEmail(
    recipientEmail: string,
    welcomeData: any,
  ): Promise<boolean> {
    const htmlContent = this.generateWelcomeTemplate(welcomeData);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: '🎉 Welcome to InvicTask! Your Account is Ready',
      htmlContent,
      textContent: `Welcome to InvicTask! Your email has been verified and your account is now active. Start managing your projects today!`,
    };

    return this.sendEmail(emailData);
  }

  async sendForgotPasswordEmail(
    recipientEmail: string,
    resetData: any,
  ): Promise<boolean> {
    const htmlContent = this.generateForgotPasswordTemplate(resetData);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: 'Password Reset Request',
      htmlContent,
      textContent: `You have requested to reset your password. Click the link below to reset it: ${resetData.resetUrl}`,
    };

    return this.sendEmail(emailData);
  }

  async sendPasswordResetEmail(
    recipientEmail: string,
    resetData: any,
  ): Promise<boolean> {
    const htmlContent = this.generatePasswordResetTemplate(resetData);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: 'Password Reset Successful',
      htmlContent,
      textContent: `Your password has been successfully reset.`,
    };

    return this.sendEmail(emailData);
  }

  async sendTeamInvitationEmail(
    recipientEmail: string,
    invitationData: any,
  ): Promise<boolean> {
    console.log('invitationData', invitationData);
    console.log('recipientEmail', recipientEmail);

    const htmlContent = this.generateTeamInvitationTemplate(invitationData);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: 'You have been invited to join a team',
      htmlContent,
      textContent: `You have been invited to join a team. Click the link below to accept the invitation: ${invitationData.inviteUrl}`,
    };

    return this.sendEmail(emailData);
  }

  private generateTeamInvitationTemplate(invitationData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Team Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been invited to join a team by <strong>${invitationData.inviterName}</strong>!</p>
            <p><a href="${invitationData.inviteUrl}" class="button">Accept Invitation</a></p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This invitation was sent by ${invitationData.inviterName} via InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateForgotPasswordTemplate(resetData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e11d48; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #e11d48; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have requested to reset your password. Click the button below to reset it.</p>
            <p><a href="${resetData.resetUrl}" class="button">Reset Password</a></p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(resetData: any): string {
    return `    
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your password has been successfully reset.</p>
            <p>Best regards,<br>InvicTask Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from InvicTask.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailVerificationTemplate(verificationData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - InvicTask</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-message {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2d3748;
          }
          .verification-box {
            background: #f7fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
          }
          .verify-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
          }
          .verify-button:hover {
            transform: translateY(-2px);
          }
          .security-note {
            background: #fff5f5;
            border-left: 4px solid #f56565;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f7fafc;
            text-align: center;
            padding: 30px 20px;
            color: #718096;
            font-size: 14px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .features {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            flex-wrap: wrap;
          }
          .feature {
            text-align: center;
            flex: 1;
            min-width: 150px;
            margin: 10px;
          }
          .feature-icon {
            font-size: 30px;
            margin-bottom: 10px;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .features { flex-direction: column; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📋 InvicTask</div>
            <h1>Welcome to InvicTask!</h1>
            <p>Your journey to better project management starts here</p>
          </div>

          <div class="content">
            <div class="welcome-message">
              <p>Hi <strong>${verificationData.firstName}</strong>,</p>
              <p>Welcome to <strong>InvicTask</strong> - the complete project management solution that helps teams collaborate, organize, and achieve their goals!</p>
            </div>

            <div class="features">
              <div class="feature">
                <div class="feature-icon">🚀</div>
                <h4>Project Management</h4>
                <p>Organize your work with powerful project tools</p>
              </div>
              <div class="feature">
                <div class="feature-icon">👥</div>
                <h4>Team Collaboration</h4>
                <p>Work together seamlessly with your team</p>
              </div>
              <div class="feature">
                <div class="feature-icon">📊</div>
                <h4>Progress Tracking</h4>
                <p>Monitor progress with real-time dashboards</p>
              </div>
            </div>

            <div class="verification-box">
              <h3>🔐 Verify Your Email Address</h3>
              <p>To get started and secure your account, please verify your email address by clicking the button below:</p>

              <a href="${verificationData.verificationUrl}" class="verify-button">
                ✅ Verify Email Address
              </a>

              <p style="margin-top: 20px; font-size: 14px; color: #718096;">
                This link will expire in 24 hours for security reasons.
              </p>
            </div>

            <div class="security-note">
              <h4>🛡️ Security Note</h4>
              <p>If you didn't create an account with InvicTask, please ignore this email. Your email address will not be added to our system.</p>
            </div>

            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>✅ Create and manage projects</li>
              <li>✅ Invite team members to collaborate</li>
              <li>✅ Track tasks and deadlines</li>
              <li>✅ Access powerful productivity tools</li>
              <li>✅ Get real-time notifications</li>
            </ul>

            <p>If you have any questions or need help getting started, our support team is here to help!</p>

            <p>Best regards,<br>
            <strong>The InvicTask Team</strong></p>
          </div>

          <div class="footer">
            <p><strong>InvicTask</strong> - Complete Project Management Solution</p>
            <p>This email was sent because you signed up for InvicTask.</p>
            <p>If you can't click the button above, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationData.verificationUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeTemplate(welcomeData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to InvicTask! 🎉</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 300;
          }
          .success-badge {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50px;
            padding: 10px 20px;
            display: inline-block;
            margin-bottom: 20px;
            font-size: 18px;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-message {
            font-size: 18px;
            margin-bottom: 30px;
            color: #2d3748;
            text-align: center;
          }
          .success-box {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-radius: 12px;
            padding: 30px;
            margin: 25px 0;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 15px;
          }
          .get-started-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
            margin: 20px 0;
          }
          .get-started-button:hover {
            transform: translateY(-2px);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .feature-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .feature-icon {
            font-size: 32px;
            margin-bottom: 15px;
          }
          .feature-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2d3748;
          }
          .feature-desc {
            font-size: 14px;
            color: #718096;
          }
          .next-steps {
            background: #fff5f5;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f7fafc;
            text-align: center;
            padding: 30px 20px;
            color: #718096;
            font-size: 14px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .features-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-badge">✅ Email Verified</div>
            <div class="logo">📋 InvicTask</div>
            <h1>Welcome to InvicTask!</h1>
            <p>Your account is now active and ready to use</p>
          </div>

          <div class="content">
            <div class="welcome-message">
              <p>Hi <strong>${welcomeData.firstName}</strong>,</p>
              <p>🎉 <strong>Congratulations!</strong> Your email has been successfully verified and your InvicTask account is now fully active!</p>
            </div>

            <div class="success-box">
              <div class="success-icon">🚀</div>
              <h3>You're All Set!</h3>
              <p>Your account was verified on <strong>${new Date(welcomeData.verifiedAt).toLocaleDateString()}</strong></p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard" class="get-started-button">
                🏁 Start Managing Projects
              </a>
            </div>

            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">📊</div>
                <div class="feature-title">Project Management</div>
                <div class="feature-desc">Create and organize projects with powerful tools and templates</div>
              </div>
              <div class="feature-card">
                <div class="feature-icon">👥</div>
                <div class="feature-title">Team Collaboration</div>
                <div class="feature-desc">Invite team members and collaborate in real-time</div>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📈</div>
                <div class="feature-title">Progress Tracking</div>
                <div class="feature-desc">Monitor progress with dashboards and analytics</div>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Automation</div>
                <div class="feature-desc">Automate workflows and save time on repetitive tasks</div>
              </div>
            </div>

            <div class="next-steps">
              <h4>🎯 What's Next?</h4>
              <ul style="text-align: left; margin: 15px 0;">
                <li>✅ <strong>Create your first project</strong> - Start organizing your work</li>
                <li>✅ <strong>Invite team members</strong> - Collaborate with your team</li>
                <li>✅ <strong>Set up workspaces</strong> - Organize projects by department or team</li>
                <li>✅ <strong>Explore templates</strong> - Use pre-built project templates</li>
                <li>✅ <strong>Configure notifications</strong> - Stay updated on important changes</li>
              </ul>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              Need help getting started? Check out our
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/help" style="color: #10b981; text-decoration: none;">
                📚 Help Center
              </a>
              or contact our support team.
            </p>

            <p style="text-align: center;">
              Welcome aboard! 🎊<br>
              <strong>The InvicTask Team</strong>
            </p>
          </div>

          <div class="footer">
            <p><strong>InvicTask</strong> - Complete Project Management Solution</p>
            <p>You're receiving this email because you successfully verified your InvicTask account.</p>
            <p>Ready to boost your productivity? <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard" style="color: #10b981;">Login to your dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#f59e0b';
      case 'normal':
        return '#10b981';
      case 'low':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }

  // ==================== ENHANCED INVITATION EMAIL METHODS ====================

  async sendOrganizationInvitationEmail(
    recipientEmail: string,
    data: any,
  ): Promise<boolean> {
    const htmlContent = this.generateOrganizationInvitationTemplate(data);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: `You've been invited to join ${data.organizationName} 🎉`,
      htmlContent,
      textContent: `${data.inviterName} has invited you to join ${data.organizationName}. Role: ${data.role}. ${data.message ? `Message: ${data.message}` : ''} Click the link to accept: ${data.acceptUrl}`,
    };

    return this.sendEmail(emailData);
  }

  async sendInternalInvitationEmail(
    recipientEmail: string,
    data: any,
  ): Promise<boolean> {
    const htmlContent = this.generateInternalInvitationTemplate(data);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: `You've been invited to join ${data.organizationName} 📨`,
      htmlContent,
      textContent: `${data.inviterName} has invited you to join ${data.organizationName}. Role: ${data.role}. ${data.message ? `Message: ${data.message}` : ''} Accept or decline in your dashboard.`,
    };

    return this.sendEmail(emailData);
  }

  async sendMemberJoinedEmail(
    recipientEmail: string,
    data: any,
  ): Promise<boolean> {
    const htmlContent = this.generateMemberJoinedTemplate(data);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: `${data.newMemberName} joined ${data.organizationName} 👋`,
      htmlContent,
      textContent: `${data.newMemberName} (${data.newMemberEmail}) has joined your organization ${data.organizationName} as a ${data.role}.`,
    };

    return this.sendEmail(emailData);
  }

  async sendInternalInvitationAcceptedEmail(
    recipientEmail: string,
    data: any,
  ): Promise<boolean> {
    const htmlContent = this.generateInternalInvitationAcceptedTemplate(data);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: `${data.memberName} accepted your invitation ✅`,
      htmlContent,
      textContent: `${data.memberName} (${data.memberEmail}) has accepted your invitation to join ${data.organizationName} as a ${data.role}.`,
    };

    return this.sendEmail(emailData);
  }

  async sendInternalInvitationDeclinedEmail(
    recipientEmail: string,
    data: any,
  ): Promise<boolean> {
    const htmlContent = this.generateInternalInvitationDeclinedTemplate(data);

    const emailData: EmailNotificationDto = {
      to: recipientEmail,
      subject: `${data.memberName} declined your invitation ❌`,
      htmlContent,
      textContent: `${data.memberName} (${data.memberEmail}) has declined your invitation to join ${data.organizationName}. ${data.reason ? `Reason: ${data.reason}` : ''}`,
    };

    return this.sendEmail(emailData);
  }

  // ==================== EMAIL TEMPLATE GENERATORS ====================

  private generateOrganizationInvitationTemplate(data: any): string {
    const expiryDate = data.expiresAt
      ? new Date(data.expiresAt).toLocaleDateString()
      : '7 days';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Organization Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            You're Invited! 🎉
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            Join ${data.organizationName} and start collaborating
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 36px;">👥</span>
            </div>
          </div>

          <h2 style="color: #333; text-align: center; margin: 0 0 20px 0; font-size: 24px;">
            ${data.inviterName} invited you to join
          </h2>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">
              ${data.organizationName}
            </h3>
            <div style="margin: 10px 0;">
              <span style="color: #666; font-weight: 500;">Your Role:</span>
              <span style="color: #333; font-weight: 600; text-transform: capitalize;
                           background: #e3f2fd; padding: 4px 12px; border-radius: 20px; margin-left: 8px;">
                ${data.role}
              </span>
            </div>

            <!-- Pricing Plan Information -->
            ${
              data.pricingPlan
                ? `
            <div style="margin: 15px 0; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 8px; color: white;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 20px; margin-right: 8px;">💎</span>
                <span style="font-weight: 600; text-transform: uppercase; font-size: 14px;">
                  ${data.pricingPlan} Plan
                </span>
              </div>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                ${data.planFeatures}
              </p>
            </div>
            `
                : ''
            }

            ${
              data.message
                ? `
            <div style="margin: 15px 0 0 0; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
              <span style="color: #666; font-weight: 500;">Personal Message:</span>
              <p style="color: #333; margin: 8px 0 0 0; font-style: italic;">"${data.message}"</p>
            </div>
            `
                : ''
            }
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.acceptUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none;
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              Accept Invitation
            </a>
          </div>

          <!-- Alternative Link -->
          <div style="text-align: center; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Can't click the button? Copy and paste this link:
            </p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 5px 0;">
              ${data.acceptUrl}
            </p>
          </div>

          <!-- Expiry Notice -->
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 25px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px; text-align: center;">
              ⏰ This invitation expires on ${expiryDate}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            This invitation was sent by ${data.inviterName}
          </p>
          <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private generateInternalInvitationTemplate(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Internal Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            Team Invitation 📨
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            You've been invited to join ${data.organizationName}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; text-align: center; margin: 0 0 20px 0; font-size: 24px;">
            ${data.inviterName} invited you to join their team
          </h2>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4f46e5;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">
              ${data.organizationName}
            </h3>
            <div style="margin: 10px 0;">
              <span style="color: #666; font-weight: 500;">Your Role:</span>
              <span style="color: #333; font-weight: 600; text-transform: capitalize;
                           background: #e0e7ff; padding: 4px 12px; border-radius: 20px; margin-left: 8px;">
                ${data.role}
              </span>
            </div>
            ${
              data.message
                ? `
            <div style="margin: 15px 0 0 0; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
              <span style="color: #666; font-weight: 500;">Message:</span>
              <p style="color: #333; margin: 8px 0 0 0; font-style: italic;">"${data.message}"</p>
            </div>
            `
                : ''
            }
          </div>

          <!-- CTA Buttons -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.acceptUrl}"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 30px;
                      border-radius: 6px; text-decoration: none; font-weight: 600; margin: 0 10px;">
              Accept
            </a>
            <a href="${data.declineUrl}"
               style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px;
                      border-radius: 6px; text-decoration: none; font-weight: 600; margin: 0 10px;">
              Decline
            </a>
          </div>

          <p style="text-align: center; color: #666; font-size: 14px;">
            You can also respond to this invitation in your dashboard.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            This invitation was sent by ${data.inviterName}
          </p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private generateMemberJoinedTemplate(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Member Joined</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            New Team Member! 👋
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${data.newMemberName} has joined your organization
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                      border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 36px;">👤</span>
          </div>

          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
            Welcome ${data.newMemberName}!
          </h2>

          <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <p style="color: #333; margin: 0; font-size: 16px;">
              <strong>${data.newMemberName}</strong> (${data.newMemberEmail}) has joined
              <strong>${data.organizationName}</strong> as a <strong>${data.role}</strong>.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Your team is growing! Make sure to welcome them and help them get started.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            ${data.organizationName} Team
          </p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private generateInternalInvitationAcceptedTemplate(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Accepted</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            Invitation Accepted! ✅
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            Great news about your team invitation
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                      border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 36px;">✅</span>
          </div>

          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
            ${data.memberName} accepted your invitation!
          </h2>

          <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <p style="color: #333; margin: 0; font-size: 16px;">
              <strong>${data.memberName}</strong> (${data.memberEmail}) has accepted your invitation
              to join <strong>${data.organizationName}</strong> as a <strong>${data.role}</strong>.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            They're now part of your team and can start collaborating right away!
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            ${data.organizationName} Team
          </p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private generateInternalInvitationDeclinedTemplate(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Declined</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            Invitation Declined ❌
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            Update about your team invitation
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                      border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 36px;">❌</span>
          </div>

          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
            ${data.memberName} declined your invitation
          </h2>

          <div style="background: #fef3c7; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <p style="color: #333; margin: 0; font-size: 16px;">
              <strong>${data.memberName}</strong> (${data.memberEmail}) has declined your invitation
              to join <strong>${data.organizationName}</strong>.
            </p>
            ${
              data.reason
                ? `
            <div style="margin: 15px 0 0 0; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
              <span style="color: #666; font-weight: 500;">Reason:</span>
              <p style="color: #333; margin: 8px 0 0 0; font-style: italic;">"${data.reason}"</p>
            </div>
            `
                : ''
            }
          </div>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            You can always send another invitation later if needed.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">
            ${data.organizationName} Team
          </p>
        </div>
      </div>
    </body>
    </html>`;
  }
}
