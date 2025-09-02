import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus, UserRole } from '../../../entities/user.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/enums/notification.enum';

import {
  UpdateUserProfileDto,
  UpdateUserPreferencesDto,
  UpdateUserStatusDto,
  UserProfileResponseDto,
  UserListResponseDto,
  UserFilterDto,
  UserStatsDto,
  UserNotificationSettingsDto,
} from '../dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(filter: UserFilterDto): Promise<UserListResponseDto> {
    const { search, role, status, isVerified, sortBy, sortOrder, page, limit } =
      filter;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('user.isEmailVerified = :isVerified', {
        isVerified,
      });
    }

    // Apply sorting
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'DESC';
    queryBuilder.orderBy(`user.${sortField}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map((user) => this.mapToResponseDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateProfile(
    id: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge updates
    Object.assign(user, updateUserProfileDto);

    const updatedUser = await this.userRepository.save(user);

    // Send notification about profile update
    await this.notificationService.sendNotification({
      type: NotificationType.ACCOUNT_SETTINGS_CHANGED,
      title: 'Profile Updated',
      message: 'Your profile has been successfully updated.',
      recipientId: user.id,
      channels: ['in_app'] as any,
      priority: 'low' as any,
      data: {
        userId: user.id,
        updatedFields: Object.keys(updateUserProfileDto),
      },
    });

    this.logger.log(`User profile updated: ${updatedUser.email}`);
    return this.mapToResponseDto(updatedUser);
  }

  async updatePreferences(
    id: string,
    updateUserPreferencesDto: UpdateUserPreferencesDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge preferences
    user.preferences = {
      ...user.preferences,
      ...updateUserPreferencesDto.preferences,
      notifications: {
        ...user.preferences?.notifications,
        ...updateUserPreferencesDto.preferences?.notifications,
      },
    } as any;

    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`User preferences updated: ${updatedUser.email}`);
    return this.mapToResponseDto(updatedUser);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateUserStatusDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = updateStatusDto.status;
    const updatedUser = await this.userRepository.save(user);

    // Send notification about status change
    await this.notificationService.sendNotification({
      type: NotificationType.ACCOUNT_SETTINGS_CHANGED,
      title: 'Account Status Updated',
      message: `Your account status has been changed to ${updateStatusDto.status}`,
      recipientId: user.id,
      channels: ['email', 'in_app'] as any,
      priority: 'high' as any,
      data: {
        userId: user.id,
        newStatus: updateStatusDto.status,
        reason: updateStatusDto.reason,
      },
    });

    this.logger.log(
      `User status updated: ${updatedUser.email} -> ${updateStatusDto.status}`,
    );
    return this.mapToResponseDto(updatedUser);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    });
  }

  async updateLastActive(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastActiveAt: new Date(),
    });
  }

  async uploadAvatar(
    id: string,
    avatarUrl: string,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatar = avatarUrl;
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`Avatar updated for user: ${user.email}`);
    return this.mapToResponseDto(updatedUser);
  }

  async removeAvatar(id: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatar = null;
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`Avatar removed for user: ${user.email}`);
    return this.mapToResponseDto(updatedUser);
  }

  async getStats(): Promise<UserStatsDto> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { status: UserStatus.ACTIVE },
    });
    const verifiedUsers = await this.userRepository.count({
      where: { isEmailVerified: true },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    // Get users by role
    const usersByRole = {} as Record<UserRole, number>;
    for (const role of Object.values(UserRole)) {
      usersByRole[role] = await this.userRepository.count({ where: { role } });
    }

    // Get users by status
    const usersByStatus = {} as Record<UserStatus, number>;
    for (const status of Object.values(UserStatus)) {
      usersByStatus[status] = await this.userRepository.count({
        where: { status },
      });
    }

    // Get recent users
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      usersByRole,
      usersByStatus,
      recentUsers: recentUsers.map((user) => this.mapToResponseDto(user)),
    };
  }

  async searchUsers(
    query: string,
    limit: number = 10,
  ): Promise<UserProfileResponseDto[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query OR user.displayName ILIKE :query)',
        { query: `%${query}%` },
      )
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .orderBy('user.firstName', 'ASC')
      .take(limit)
      .getMany();

    return users.map((user) => this.mapToResponseDto(user));
  }

  async getNotificationSettings(
    id: string,
  ): Promise<UserNotificationSettingsDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = user.preferences || {};
    const notifications = preferences.notifications || {};

    return {
      email: notifications.email ?? true,
      push: notifications.push ?? true,
      desktop: notifications.desktop ?? true,
      sound: notifications.sound ?? true,
      taskAssigned: (notifications as any).taskAssigned ?? true,
      taskDue: (notifications as any).taskDue ?? true,
      taskCompleted: (notifications as any).taskCompleted ?? false,
      projectUpdates: (notifications as any).projectUpdates ?? true,
      teamInvitations: (notifications as any).teamInvitations ?? true,
      comments: (notifications as any).comments ?? false,
      mentions: (notifications as any).mentions ?? true,
      weeklyDigest: (notifications as any).weeklyDigest ?? true,
    };
  }

  async updateNotificationSettings(
    id: string,
    settings: UserNotificationSettingsDto,
  ): Promise<UserNotificationSettingsDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.preferences = {
      ...user.preferences,
      notifications: {
        ...user.preferences?.notifications,
        ...settings,
      },
    };

    await this.userRepository.save(user);

    this.logger.log(`Notification settings updated for user: ${user.email}`);
    return settings;
  }

  async deactivateAccount(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.INACTIVE;
    user.isActive = false;
    await this.userRepository.save(user);

    // Send notification
    await this.notificationService.sendNotification({
      type: NotificationType.ACCOUNT_SETTINGS_CHANGED,
      title: 'Account Deactivated',
      message:
        'Your account has been deactivated. You can reactivate it anytime by logging in.',
      recipientId: user.id,
      channels: ['email'] as any,
      priority: 'high' as any,
      data: {
        userId: user.id,
        deactivatedAt: new Date(),
      },
    });

    this.logger.log(`Account deactivated: ${user.email}`);
    return { message: 'Account deactivated successfully' };
  }

  async reactivateAccount(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.ACTIVE;
    user.isActive = true;
    await this.userRepository.save(user);

    this.logger.log(`Account reactivated: ${user.email}`);
    return { message: 'Account reactivated successfully' };
  }

  private mapToResponseDto(user: User): UserProfileResponseDto {
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
}
