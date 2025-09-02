import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { UserRole, UserStatus } from '../../../entities/user.entity';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
    slack?: string;
  };
}

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsObject()
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    startOfWeek?: 'monday' | 'sunday';
    notifications?: {
      email?: boolean;
      push?: boolean;
      desktop?: boolean;
      sound?: boolean;
    };
    privacy?: {
      showEmail?: boolean;
      showPhone?: boolean;
      showOnlineStatus?: boolean;
      allowDirectMessages?: boolean;
    };
  };
}

export class UserProfileResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  fullName: string;
  initials: string;
  avatar?: string | null;
  bio?: string;
  phone?: string;
  timezone: string;
  locale: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  preferences?: any;
  socialLinks?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class UserListResponseDto {
  users: UserProfileResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'lastName' | 'email' | 'lastLoginAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  page: number = 1;

  @IsOptional()
  limit: number = 20;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UserStatsDto {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  recentUsers: UserProfileResponseDto[];
}

export class UserActivityDto {
  id: string;
  type: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export class UserNotificationSettingsDto {
  email: boolean;
  push: boolean;
  desktop: boolean;
  sound: boolean;
  taskAssigned: boolean;
  taskDue: boolean;
  taskCompleted: boolean;
  projectUpdates: boolean;
  teamInvitations: boolean;
  comments: boolean;
  mentions: boolean;
  weeklyDigest: boolean;
}
