import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationRole,
} from '../../../entities/organization.entity';
import { User } from '../../../entities/user.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '../../../entities/workspace.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/enums/notification.enum';

import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  OrganizationResponseDto,
  OrganizationMemberResponseDto,
  OrganizationInvitationResponseDto,
  OrganizationStatsDto,
} from '../dto/organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private readonly organizationInvitationRepository: Repository<OrganizationInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    ownerId: string,
  ): Promise<OrganizationResponseDto> {
    // Check if user already owns an organization (for free plan)
    const existingOrganization = await this.organizationRepository.findOne({
      where: { ownerId },
    });

    if (existingOrganization) {
      throw new ConflictException('User already owns an organization');
    }

    // Create organization
    const organization = this.organizationRepository.create({
      ...createOrganizationDto,
      slug: this.generateSlug(createOrganizationDto.name),
      ownerId,
      settings: this.getDefaultSettings(),
    } as any);

    const savedOrganization = (await this.organizationRepository.save(
      organization,
    )) as unknown as Organization;

    // Add owner as organization member
    const organizationMember = this.organizationMemberRepository.create({
      organizationId: savedOrganization.id,
      userId: ownerId,
      role: OrganizationRole.OWNER,
      joinedAt: new Date(),
    });

    await this.organizationMemberRepository.save(organizationMember);

    // Create default workspace
    const workspace = this.workspaceRepository.create({
      name: 'General',
      description: 'Default workspace for your organization',
      organizationId: savedOrganization.id,
      ownerId,
      settings: this.getDefaultWorkspaceSettings(),
    } as any);

    const savedWorkspace = (await this.workspaceRepository.save(
      workspace,
    )) as unknown as Workspace;

    // Add owner as workspace admin
    const workspaceMember = this.workspaceMemberRepository.create({
      workspaceId: savedWorkspace.id,
      userId: ownerId,
      role: WorkspaceRole.ADMIN,
      joinedAt: new Date(),
    });

    await this.workspaceMemberRepository.save(workspaceMember);

    this.logger.log(
      `Organization created: ${savedOrganization.name} by user ${ownerId}`,
    );

    return this.mapToResponseDto(savedOrganization);
  }

  async findUserOrganizations(
    userId: string,
  ): Promise<OrganizationResponseDto[]> {
    const memberships = await this.organizationMemberRepository.find({
      where: { userId, isActive: true },
      relations: ['organization', 'organization.owner'],
    });

    return memberships.map((membership) =>
      this.mapToResponseDto(membership.organization),
    );
  }

  async findOne(id: string, userId: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is a member
    await this.checkMembership(id, userId);

    return this.mapToResponseDto(organization);
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check permissions (only owner and admins can update)
    await this.checkPermissions(id, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Update slug if name changed
    if (
      updateOrganizationDto.name &&
      updateOrganizationDto.name !== organization.name
    ) {
      updateOrganizationDto['slug'] = this.generateSlug(
        updateOrganizationDto.name,
      );
    }

    Object.assign(organization, updateOrganizationDto);
    const updatedOrganization =
      await this.organizationRepository.save(organization);

    this.logger.log(
      `Organization updated: ${organization.name} by user ${userId}`,
    );

    return this.mapToResponseDto(updatedOrganization);
  }

  async inviteMember(
    organizationId: string,
    inviteMemberDto: InviteMemberDto,
    inviterId: string,
  ): Promise<OrganizationInvitationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check permissions
    await this.checkPermissions(organizationId, inviterId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Check if user is already a member
    const existingMember = await this.organizationMemberRepository.findOne({
      where: { organizationId, user: { email: inviteMemberDto.email } },
      relations: ['user'],
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation =
      await this.organizationInvitationRepository.findOne({
        where: {
          organizationId,
          email: inviteMemberDto.email,
          isAccepted: false,
        },
      });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = this.organizationInvitationRepository.create({
      organizationId,
      email: inviteMemberDto.email,
      role: inviteMemberDto.role,
      invitedBy: inviterId,
      token,
      message: inviteMemberDto.message,
      expiresAt,
    });

    const savedInvitation =
      await this.organizationInvitationRepository.save(invitation);

    // Send invitation email
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_INVITATION,
      title: 'Organization Invitation',
      message: `You have been invited to join "${organization.name}" organization`,
      recipientId: 'email:' + inviteMemberDto.email, // Special format for email-only recipients
      senderId: inviterId,
      channels: ['email'] as any,
      priority: 'medium' as any,
      data: {
        organizationId,
        organizationName: organization.name,
        role: inviteMemberDto.role,
        inviteMessage: inviteMemberDto.message,
        inviteUrl: `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`,
        expiresAt,
      },
    });

    this.logger.log(
      `Organization invitation sent: ${inviteMemberDto.email} to ${organization.name}`,
    );

    return this.mapInvitationToResponseDto(savedInvitation);
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ message: string }> {
    const invitation = await this.organizationInvitationRepository.findOne({
      where: { token, isAccepted: false },
      relations: ['organization', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException(
        'Invitation email does not match user email',
      );
    }

    // Check if user is already a member
    const existingMember = await this.organizationMemberRepository.findOne({
      where: { organizationId: invitation.organizationId, userId },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Create organization member
    const organizationMember = this.organizationMemberRepository.create({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
    });

    await this.organizationMemberRepository.save(organizationMember);

    // Mark invitation as accepted
    invitation.isAccepted = true;
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;
    await this.organizationInvitationRepository.save(invitation);

    // Send notification to organization admins
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_MEMBER_JOINED,
      title: 'New Member Joined',
      message: `${user.fullName} has joined your organization`,
      recipientId: invitation.organization.ownerId,
      senderId: userId,
      channels: ['email', 'in_app'] as any,
      priority: 'medium' as any,
      data: {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        newMemberName: user.fullName,
        newMemberEmail: user.email,
        role: invitation.role,
      },
    });

    this.logger.log(
      `Organization invitation accepted: ${user.email} joined ${invitation.organization.name}`,
    );

    return { message: 'Successfully joined organization' };
  }

  async getMembers(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    await this.checkMembership(organizationId, userId);

    const members = await this.organizationMemberRepository.find({
      where: { organizationId, isActive: true },
      relations: ['user', 'inviter'],
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.mapMemberToResponseDto(member));
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
    userId: string,
  ): Promise<OrganizationMemberResponseDto> {
    // Check permissions
    await this.checkPermissions(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const member = await this.organizationMemberRepository.findOne({
      where: { id: memberId, organizationId },
      relations: ['user', 'inviter'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (member.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }

    member.role = updateMemberRoleDto.role;
    const updatedMember = await this.organizationMemberRepository.save(member);

    // Send notification to member
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_ROLE_UPDATED,
      title: 'Role Updated',
      message: `Your role has been updated to ${updateMemberRoleDto.role}`,
      recipientId: member.userId,
      senderId: userId,
      channels: ['email', 'in_app'] as any,
      priority: 'medium' as any,
      data: {
        organizationId,
        newRole: updateMemberRoleDto.role,
      },
    });

    this.logger.log(
      `Organization member role updated: ${member.user.email} to ${updateMemberRoleDto.role}`,
    );

    return this.mapMemberToResponseDto(updatedMember);
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check permissions
    await this.checkPermissions(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const member = await this.organizationMemberRepository.findOne({
      where: { id: memberId, organizationId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (member.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    await this.organizationMemberRepository.remove(member);

    // Send notification to removed member
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_MEMBER_LEFT,
      title: 'Removed from Organization',
      message: 'You have been removed from the organization',
      recipientId: member.userId,
      senderId: userId,
      channels: ['email', 'in_app'] as any,
      priority: 'medium' as any,
      data: {
        organizationId,
      },
    });

    this.logger.log(`Organization member removed: ${member.user.email}`);

    return { message: 'Member removed successfully' };
  }

  async getStats(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationStatsDto> {
    await this.checkMembership(organizationId, userId);

    const totalMembers = await this.organizationMemberRepository.count({
      where: { organizationId, isActive: true },
    });

    const totalWorkspaces = await this.workspaceRepository.count({
      where: { organizationId, isActive: true },
    });

    // TODO: Add project and task counts when those modules are implemented

    return {
      totalMembers,
      totalWorkspaces,
      totalProjects: 0,
      totalTasks: 0,
      activeMembers: totalMembers, // TODO: Calculate based on recent activity
      recentActivity: [], // TODO: Implement activity tracking
    };
  }

  private async checkMembership(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this organization');
    }
  }

  private async checkPermissions(
    organizationId: string,
    userId: string,
    allowedRoles: OrganizationRole[],
  ): Promise<void> {
    const member = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private mapToResponseDto(
    organization: Organization,
  ): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      logo: organization.logo,
      website: organization.website,
      industry: organization.industry,
      size: organization.size,
      plan: organization.plan,
      memberCount: organization.memberCount,
      workspaceCount: organization.workspaceCount,
      owner: {
        id: organization.owner.id,
        firstName: organization.owner.firstName,
        lastName: organization.owner.lastName,
        email: organization.owner.email,
        avatar: organization.owner.avatar,
      },
      settings: organization.settings,
      isActive: organization.isActive,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private mapMemberToResponseDto(
    member: OrganizationMember,
  ): OrganizationMemberResponseDto {
    return {
      id: member.id,
      role: member.role,
      permissions: member.permissions || [],
      joinedAt: member.joinedAt,
      lastActiveAt: member.lastActiveAt,
      isActive: member.isActive,
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        avatar: member.user.avatar,
        displayName: member.user.displayName,
      },
      inviter: member.inviter
        ? {
            id: member.inviter.id,
            firstName: member.inviter.firstName,
            lastName: member.inviter.lastName,
          }
        : undefined,
    };
  }

  private mapInvitationToResponseDto(
    invitation: OrganizationInvitation,
  ): OrganizationInvitationResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      message: invitation.message,
      isAccepted: invitation.isAccepted,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviter: {
        id: invitation.inviter.id,
        firstName: invitation.inviter.firstName,
        lastName: invitation.inviter.lastName,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private getDefaultSettings() {
    return {
      allowPublicWorkspaces: false,
      requireEmailVerification: true,
      allowGuestAccess: false,
      defaultWorkspaceVisibility: 'private',
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
      defaultProjectVisibility: 'private',
      features: {
        timeTracking: true,
        customFields: true,
        goals: true,
        portfolios: false,
        dashboards: true,
        automations: false,
      },
      permissions: {
        whoCanCreateProjects: 'members',
        whoCanInviteMembers: 'admins',
        whoCanDeleteTasks: 'admins',
      },
      notifications: {
        emailDigest: true,
        slackIntegration: false,
      },
      customFields: [],
    };
  }
}
