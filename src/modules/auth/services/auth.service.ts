import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User, UserStatus, UserRole } from '../../../entities/user.entity';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '../../../entities/organization.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '../../../entities/workspace.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/enums/notification.enum';

import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  AuthResponseDto,
  TokenResponseDto,
  UserProfileDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Generate email verification token (not needed for SUPER_ADMIN)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const isSuperAdmin = registerDto.email === 'admin@gmail.com';

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      displayName:
        registerDto.displayName ||
        `${registerDto.firstName} ${registerDto.lastName}`,
      password: hashedPassword,
      timezone: registerDto.timezone || 'UTC',
      locale: registerDto.locale || 'en',
      emailVerificationToken: isSuperAdmin ? null : emailVerificationToken,
      isEmailVerified: isSuperAdmin ? true : false,
      emailVerifiedAt: isSuperAdmin ? new Date() : undefined,
      role: isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.USER,
      preferences: this.getDefaultPreferences(),
    } as any);

    const savedUser = (await this.userRepository.save(user)) as unknown as User;

    // Create organization if provided
    let organization: Organization | null = null;
    let organizationMember: OrganizationMember | null = null;

    if (registerDto.organizationName) {
      organization = this.organizationRepository.create({
        name: registerDto.organizationName,
        slug: this.generateSlug(registerDto.organizationName),
        ownerId: savedUser.id,
        settings: this.getDefaultOrganizationSettings(),
      });

      organization = await this.organizationRepository.save(organization);

      // Add user as organization owner
      organizationMember = this.organizationMemberRepository.create({
        organizationId: organization.id,
        userId: savedUser.id,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      await this.organizationMemberRepository.save(organizationMember);

      // Create default workspace
      const workspace = this.workspaceRepository.create({
        name: 'General',
        description: 'Default workspace for your organization',
        organizationId: organization.id,
        ownerId: savedUser.id,
        settings: this.getDefaultWorkspaceSettings(),
      });

      const savedWorkspace = await this.workspaceRepository.save(workspace);

      // Add user as workspace admin
      const workspaceMember = this.workspaceMemberRepository.create({
        workspaceId: savedWorkspace.id,
        userId: savedUser.id,
        role: WorkspaceRole.ADMIN,
        joinedAt: new Date(),
      });

      await this.workspaceMemberRepository.save(workspaceMember);
    }

    // Send verification email (skip for SUPER_ADMIN)
    if (savedUser.role !== UserRole.SUPER_ADMIN) {
      await this.notificationService.sendNotification({
        type: NotificationType.ACCOUNT_SETTINGS_CHANGED,
        title: 'Welcome to InvicTask! Verify Your Email',
        message:
          'Please verify your email address to complete your registration.',
        recipientId: savedUser.id,
        email: savedUser.email,
        channels: ['email'] as any,
        priority: 'high' as any,
        data: {
          userId: savedUser.id,
          verificationToken: emailVerificationToken,
          verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${emailVerificationToken}`,
          firstName: savedUser.firstName,
        },
      });

      this.logger.log(`Verification email sent to: ${savedUser.email}`);
    } else {
      this.logger.log(
        `SUPER_ADMIN registered - email verification skipped: ${savedUser.email}`,
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(savedUser.id, savedUser.email);

    this.logger.log(`User registered: ${savedUser.email}`);

    return {
      user: this.mapUserToProfile(savedUser),
      tokens,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            role: OrganizationRole.OWNER,
          }
        : undefined,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user with organization and workspace memberships
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check two-factor authentication if enabled
    if (user.isTwoFactorEnabled && !loginDto.twoFactorCode) {
      throw new UnauthorizedException(
        'Two-factor authentication code required',
      );
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await this.userRepository.save(user);

    // Get user's organizations and workspaces
    const organizationMemberships =
      await this.organizationMemberRepository.find({
        where: { userId: user.id, isActive: true },
        relations: ['organization'],
      });

    const workspaceMemberships = await this.workspaceMemberRepository.find({
      where: { userId: user.id, isActive: true },
      relations: ['workspace'],
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Send login notification
    await this.notificationService.sendNotification({
      type: NotificationType.ACCOUNT_SECURITY,
      title: 'New Login Detected',
      message: 'A new login to your account was detected.',
      recipientId: user.id,
      channels: ['email'] as any,
      priority: 'medium' as any,
      data: {
        userId: user.id,
        loginTime: new Date(),
      },
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: this.mapUserToProfile(user),
      tokens,
      organization: organizationMemberships[0]
        ? {
            id: organizationMemberships[0].organization.id,
            name: organizationMemberships[0].organization.name,
            role: organizationMemberships[0].role,
          }
        : undefined,
      workspaces: workspaceMemberships.map((wm) => ({
        id: wm.workspace.id,
        name: wm.workspace.name,
        role: wm.role,
      })),
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    console.log('forgotPasswordDto', forgotPasswordDto);

    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to user
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await this.userRepository.save(user);

    // Send reset email
    await this.notificationService.sendNotification({
      type: NotificationType.FORGOT_PASSWORD,
      title: 'Password Reset Request',
      message:
        'You have requested to reset your password. Click the link below to reset it.',
      recipientId: user.id,
      email: user.email,
      channels: ['email'] as any,
      priority: 'high' as any,
      data: {
        userId: user.id,
        resetToken,
        resetUrl: `${this.configService.get('FRONTEND_URL')}/new-password?token=${resetToken}`,
        expiresAt: resetExpires,
        firstName: user.firstName,
      },
    });

    this.logger.log(`Password reset requested for: ${user.email}`);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: resetPasswordDto.token,
      },
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);

    // Update user
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    // Send confirmation email
    await this.notificationService.sendNotification({
      type: NotificationType.PASSWORD_RESET,
      title: 'Password Reset Successful',
      message: 'Your password has been successfully reset.',
      recipientId: user.id,
      email: user.email,
      channels: ['email'] as any,
      priority: 'medium' as any,
      data: {
        userId: user.id,
        resetTime: new Date(),
        firstName: user.firstName,
      },
    });

    this.logger.log(`Password reset completed for: ${user.email}`);
    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: verifyEmailDto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    // Send welcome email
    await this.notificationService.sendNotification({
      type: NotificationType.EMAIL_VERIFICATION_SUCCESS,
      title: 'Email Verified Successfully!',
      message:
        'Welcome to InvicTask! Your email has been verified and your account is now active.',
      recipientId: user.id,
      email: user.email,
      channels: ['email'] as any,
      priority: 'medium' as any,
      data: {
        userId: user.id,
        verifiedAt: new Date(),
        firstName: user.firstName,
      },
    });

    this.logger.log(`Email verified for: ${user.email}`);
    return { message: 'Email verified successfully' };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );
    user.password = hashedNewPassword;
    await this.userRepository.save(user);

    // Send notification
    await this.notificationService.sendNotification({
      type: NotificationType.ACCOUNT_SECURITY,
      title: 'Password Changed',
      message: 'Your password has been successfully changed.',
      recipientId: user.id,
      channels: ['email', 'in_app'] as any,
      priority: 'high' as any,
      data: {
        userId: user.id,
        changedAt: new Date(),
      },
    });

    this.logger.log(`Password changed for user: ${user.email}`);
    return { message: 'Password changed successfully' };
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Update last active time
    await this.userRepository.update(userId, {
      lastActiveAt: new Date(),
    });

    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<TokenResponseDto> {
    const payload = { email, sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  private mapUserToProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      fullName: user.fullName,
      initials: user.initials,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
      timezone: user.timezone,
      locale: user.locale,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      preferences: user.preferences,
      socialLinks: user.socialLinks,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private getDefaultPreferences() {
    return {
      theme: 'light' as 'light' | 'dark' | 'auto',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h' as '12h' | '24h',
      startOfWeek: 'monday' as 'monday' | 'sunday',
      notifications: {
        email: true,
        push: true,
        desktop: true,
        sound: true,
      },
      privacy: {
        showEmail: false,
        showPhone: false,
        showOnlineStatus: true,
        allowDirectMessages: true,
      },
    };
  }

  private getDefaultOrganizationSettings() {
    return {
      allowPublicWorkspaces: false,
      requireEmailVerification: true,
      allowGuestAccess: false,
      defaultWorkspaceVisibility: 'private' as
        | 'private'
        | 'internal'
        | 'public',
      ssoEnabled: false,
      branding: {},
      security: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
        },
        sessionTimeout: 480, // 8 hours
      },
    };
  }

  private getDefaultWorkspaceSettings() {
    return {
      allowGuestAccess: false,
      defaultProjectVisibility: 'private' as 'private' | 'internal' | 'public',
      features: {
        timeTracking: true,
        customFields: true,
        goals: true,
        portfolios: false,
        dashboards: true,
        automations: false,
      },
      permissions: {
        whoCanCreateProjects: 'members' as 'admins' | 'members' | 'everyone',
        whoCanInviteMembers: 'admins' as 'admins' | 'members' | 'everyone',
        whoCanDeleteTasks: 'admins' as 'admins' | 'members' | 'task_creators',
      },
      notifications: {
        emailDigest: true,
        slackIntegration: false,
      },
      customFields: [],
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
