import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
// @Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'en' })
  locale: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ nullable: true })
  emailVerifiedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordResetExpires: Date | null;

  @Column({ nullable: true })
  @Index()
  lastLoginAt: Date;

  @Column({ nullable: true })
  @Index()
  lastActiveAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    startOfWeek: 'monday' | 'sunday';
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
      sound: boolean;
    };
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      showOnlineStatus: boolean;
      allowDirectMessages: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
    slack?: string;
  };

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get initials(): string {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }

  get isVerified(): boolean {
    return this.isEmailVerified && this.emailVerifiedAt !== null;
  }

  get displayNameOrFullName(): string {
    return this.displayName || this.fullName;
  }

  // Relations will be added as we create other entities
  // organizationMembers?: OrganizationMember[];
  // workspaceMembers?: WorkspaceMember[];
  // projectMembers?: ProjectMember[];
  // tasks?: Task[];
  // comments?: Comment[];
}
