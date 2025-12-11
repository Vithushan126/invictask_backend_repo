import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SpaceVisibility,
  SpaceStatus,
  SpaceRole,
} from '../../../entities/space.entity';

// ==================== CREATE & UPDATE DTOs ====================

export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(SpaceVisibility)
  visibility?: SpaceVisibility;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsObject()
  settings?: {
    features?: {
      timeTracking?: boolean;
      customFields?: boolean;
      goals?: boolean;
      milestones?: boolean;
      dependencies?: boolean;
      automations?: boolean;
    };
    permissions?: {
      whoCanCreateFolders?: 'admins' | 'members' | 'everyone';
      whoCanEditSpace?: 'admins' | 'members';
      whoCanDeleteTasks?: 'admins' | 'members' | 'task_creators';
      whoCanInviteMembers?: 'admins' | 'members';
    };
    views?: {
      defaultView?: 'list' | 'board' | 'gantt' | 'calendar';
      enabledViews?: string[];
    };
    notifications?: {
      emailDigest?: boolean;
      slackIntegration?: boolean;
      webhookUrl?: string;
    };
    customFields?: Array<{
      id: string;
      name: string;
      type:
        | 'text'
        | 'number'
        | 'date'
        | 'dropdown'
        | 'checkbox'
        | 'user'
        | 'label';
      required: boolean;
      options?: string[];
      defaultValue?: any;
    }>;
  };
}

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SpaceVisibility)
  visibility?: SpaceVisibility;

  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

// ==================== SEARCH & FILTER DTOs ====================

export class SpaceSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsEnum(SpaceVisibility)
  visibility?: SpaceVisibility;

  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

// ==================== MEMBER MANAGEMENT DTOs ====================

export class InviteSpaceMemberDto {
  @IsString()
  email: string;

  @IsEnum(SpaceRole)
  role: SpaceRole;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateSpaceMemberDto {
  @IsOptional()
  @IsEnum(SpaceRole)
  role?: SpaceRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class SpaceMemberDto {
  id: string;
  userId: string;
  role: SpaceRole;
  permissions: string[];
  joinedAt: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

// ==================== RESPONSE DTOs ====================

export class SpaceResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  avatar?: string;
  visibility: SpaceVisibility;
  status: SpaceStatus;
  settings: Record<string, any>;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };

  members: {
    id: string;
    role: string;
    permissions: string[] | null;
    joinedAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatar: string | null;
    };
  }[];

  memberCount: number;
  folderCount: number;
  taskCount: number;
}

export class SpaceListDto {
  spaces: SpaceResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SpaceStatsDto {
  totalFolders: number;
  activeFolders: number;
  completedFolders: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalMembers: number;
  activeMembers: number;
  recentActivity: Array<{
    type: string;
    description: string;
    user: string;
    timestamp: Date;
  }>;
}

// ==================== BULK ACTIONS DTO ====================

export class BulkSpaceActionDto {
  @IsArray()
  @IsString({ each: true })
  spaceIds: string[];

  @IsEnum(['archive', 'restore', 'delete', 'update_status'])
  action: 'archive' | 'restore' | 'delete' | 'update_status';

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
