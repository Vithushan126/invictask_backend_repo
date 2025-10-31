import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  WorkspaceRole,
  WorkspaceVisibility,
} from '../../../entities/workspace.entity';

export class CreateWorkspaceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(WorkspaceVisibility)
  visibility?: WorkspaceVisibility;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(WorkspaceVisibility)
  visibility?: WorkspaceVisibility;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class InviteWorkspaceMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

export class WorkspaceResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string | null;
  coverImage?: string | null;
  visibility: WorkspaceVisibility;
  memberCount: number;
  projectCount?: number;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
  settings: any;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkspaceMemberResponseDto {
  id: string;
  role: WorkspaceRole;
  permissions: string[];
  joinedAt: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
    displayName?: string;
  };
  addedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class WorkspaceInvitationResponseDto {
  id: string;
  email: string;
  role: WorkspaceRole;
  message?: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    id: string;
    firstName: string;
    lastName: string;
  };
  workspace: {
    id: string;
    name: string;
  };
}

export class WorkspaceStatsDto {
  totalMembers: number;
  totalProjects?: number;
  totalTasks?: number;
  completedTasks?: number;
  overdueTasks: number;
  activeMembers: number;
  recentActivity: any[];
}

export class AcceptWorkspaceInvitationDto {
  @IsString()
  token: string;
}

export class WorkspaceFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(WorkspaceVisibility)
  visibility?: WorkspaceVisibility;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'memberCount';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  page: number = 1;

  @IsOptional()
  limit: number = 20;
}
