import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsArray,
  IsBoolean,
} from 'class-validator';
import {
  OrganizationRole,
  OrganizationPlan,
} from '../../../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  size?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  logo?: string | null;

  @IsOptional()
  settings?: any;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

export class OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: string;
  plan: OrganizationPlan;
  memberCount: number;
  workspaceCount: number;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
  };
  settings: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationMemberResponseDto {
  id: string;
  role: OrganizationRole;
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
  inviter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class OrganizationInvitationResponseDto {
  id: string;
  email: string;
  role: OrganizationRole;
  message?: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  organization: {
    id: string;
    name: string;
  } | null;
}

export class OrganizationStatsDto {
  totalMembers: number;
  totalWorkspaces: number;
  totalProjects: number;
  totalTasks: number;
  activeMembers: number;
  recentActivity: any[];
}

export class AcceptInvitationDto {
  @IsString()
  token: string;
}

// ==================== SUPER_ADMIN DTOs ====================

export class SuperAdminUpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsEnum(OrganizationPlan)
  plan?: OrganizationPlan;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  suspensionReason?: string;
}

export class SuperAdminOrganizationListDto {
  organizations: OrganizationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SuperAdminOrganizationStatsDto {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalMembers: number;
  totalWorkspaces: number;
  totalProjects: number;
  planDistribution: {
    [key in OrganizationPlan]: number;
  };
  recentOrganizations: OrganizationResponseDto[];
  growthStats: {
    organizationsThisMonth: number;
    organizationsLastMonth: number;
    membersThisMonth: number;
    membersLastMonth: number;
  };
}

export class OrganizationActivityDto {
  id: string;
  action: string;
  description: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  targetEntity: {
    type: string;
    id: string;
    name: string;
  };
  metadata: any;
  createdAt: Date;
}

export class OrganizationWorkspaceDto {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  memberCount: number;
  projectCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
