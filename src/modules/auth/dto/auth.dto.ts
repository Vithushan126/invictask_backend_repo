import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    fullName: string;
    avatar?: string | null;
    role: UserRole;
    status: string;
    isVerified: boolean;
    preferences?: any;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  organization?: {
    id: string;
    name: string;
    role: string;
  };
  workspaces?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class UserProfileDto {
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
  status: string;
  isVerified: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  preferences?: any;
  socialLinks?: any;
  createdAt: Date;
  updatedAt: Date;
}
