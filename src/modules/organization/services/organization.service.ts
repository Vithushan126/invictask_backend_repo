import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  InternalInvitation,
  OrganizationRole,
} from '../../../entities/organization.entity';
import { User } from '../../../entities/user.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '../../../entities/workspace.entity';
import { NotificationService } from '../../notification/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../notification/enums/notification.enum';

import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  InviteMultipleMembersDto,
  InternalInviteDto,
  AcceptInvitationWithAccountDto,
  DeclineInvitationDto,
  UpdateMemberRoleDto,
  OrganizationResponseDto,
  OrganizationMemberResponseDto,
  OrganizationInvitationResponseDto,
  MultipleInvitationResponseDto,
  InternalInvitationResponseDto,
  AcceptInvitationResponseDto,
  OrganizationStatsDto,
  SuperAdminOrganizationListDto,
  SuperAdminOrganizationStatsDto,
  SuperAdminUpdateOrganizationDto,
  OrganizationActivityDto,
  OrganizationWorkspaceDto,
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
    @InjectRepository(InternalInvitation)
    private readonly internalInvitationRepository: Repository<InternalInvitation>,
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

    // Load the invitation with relations for the response
    const invitationWithRelations =
      await this.organizationInvitationRepository.findOne({
        where: { id: savedInvitation.id },
        relations: ['inviter', 'organization'],
      });

    // Send invitation email
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_INVITATION,
      title: 'Organization Invitation',
      message: `You have been invited to join "${organization.name}" organization`,
      recipientId: 'email:' + inviteMemberDto.email, // Special format for email-only recipients
      email: inviteMemberDto.email,
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
        pricingPlan: inviteMemberDto.pricingPlan || 'free',
        planFeatures: inviteMemberDto.planFeatures || 'Basic features included',
      },
    });

    this.logger.log(
      `Organization invitation sent: ${inviteMemberDto.email} to ${organization.name}`,
    );

    if (!invitationWithRelations) {
      throw new Error('Failed to load invitation with relations');
    }

    return this.mapInvitationToResponseDto(invitationWithRelations);
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

  // ==================== ENHANCED INVITATION METHODS ====================

  async inviteMultipleMembers(
    organizationId: string,
    inviteDto: InviteMultipleMembersDto,
    inviterId: string,
  ): Promise<MultipleInvitationResponseDto> {
    this.logger.log(
      `Starting bulk invitation process for organization ${organizationId} with ${inviteDto.emails.length} emails`,
    );

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if inviter has permission
    await this.checkPermissions(organizationId, inviterId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const inviter = await this.userRepository.findOne({
      where: { id: inviterId },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const invitations: OrganizationInvitationResponseDto[] = [];
    const errors: string[] = [];
    const emailNotificationPromises: Promise<void>[] = [];

    this.logger.log(
      `Processing ${inviteDto.emails.length} email invitations...`,
    );

    for (const email of inviteDto.emails) {
      try {
        this.logger.debug(`Processing invitation for: ${email}`);

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`${email} is not a valid email address`);
          continue;
        }

        // Check if user is already a member
        const existingMember = await this.organizationMemberRepository.findOne({
          where: { organizationId, user: { email } },
          relations: ['user'],
        });

        if (existingMember) {
          errors.push(`${email} is already a member of this organization`);
          continue;
        }

        // Check if there's already a pending invitation
        const existingInvitation =
          await this.organizationInvitationRepository.findOne({
            where: { organizationId, email, isAccepted: false },
          });

        if (existingInvitation) {
          errors.push(`${email} already has a pending invitation`);
          continue;
        }

        // Create invitation
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = this.organizationInvitationRepository.create({
          organizationId,
          email,
          role: inviteDto.role,
          invitedBy: inviterId,
          token,
          message: inviteDto.message,
          expiresAt,
        });

        const savedInvitation =
          await this.organizationInvitationRepository.save(invitation);

        this.logger.debug(
          `Invitation created for ${email} with ID: ${savedInvitation.id}`,
        );

        // Load with relations
        const invitationWithRelations =
          await this.organizationInvitationRepository.findOne({
            where: { id: savedInvitation.id },
            relations: ['inviter', 'organization'],
          });

        if (invitationWithRelations) {
          invitations.push(
            this.mapInvitationToResponseDto(invitationWithRelations),
          );

          // Create email notification promise (non-blocking)
          const emailPromise = this.sendExternalInvitationNotification(
            email,
            organization,
            inviter,
            invitation,
            inviteDto,
          ).catch((emailError) => {
            this.logger.error(`Failed to send email to ${email}:`, emailError);
            // Don't add to errors array as invitation was created successfully
          });

          emailNotificationPromises.push(emailPromise);
        } else {
          errors.push(`Failed to load invitation details for ${email}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process invitation for ${email}:`, error);
        errors.push(`Failed to invite ${email}: ${error.message}`);
      }
    }

    // Wait for all email notifications to complete (with timeout)
    try {
      this.logger.log(
        `Sending ${emailNotificationPromises.length} invitation emails...`,
      );
      await Promise.allSettled(emailNotificationPromises);
      this.logger.log('All invitation emails processed');
    } catch (error) {
      this.logger.error('Error in email notification batch:', error);
    }

    this.logger.log(
      `Bulk invitation sent: ${invitations.length} successful, ${errors.length} failed for organization ${organization.name}`,
    );

    const summary = {
      total: inviteDto.emails.length,
      successful: invitations.length,
      failed: errors.length,
      errors,
    };

    return {
      invitations,
      message: `${invitations.length} invitations sent successfully${errors.length > 0 ? `. ${errors.length} failed` : ''}`,
      summary,
    };
  }

  async inviteInternalUser(
    organizationId: string,
    inviteDto: InternalInviteDto,
    inviterId: string,
  ): Promise<InternalInvitationResponseDto> {
    this.logger.log(
      `Creating internal invitation for user ${inviteDto.userId} to organization ${organizationId}`,
    );

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if inviter has permission
    await this.checkPermissions(organizationId, inviterId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const inviter = await this.userRepository.findOne({
      where: { id: inviterId },
    });

    const targetUser = await this.userRepository.findOne({
      where: { id: inviteDto.userId },
    });

    if (!inviter || !targetUser) {
      throw new NotFoundException('Inviter or target user not found');
    }

    // Check if user is already a member
    const existingMember = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId: inviteDto.userId },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Check if there's already a pending internal invitation
    const existingInvitation = await this.internalInvitationRepository.findOne({
      where: { organizationId, userId: inviteDto.userId, status: 'pending' },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'Internal invitation already sent to this user',
      );
    }

    // Create internal invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = this.internalInvitationRepository.create({
      organizationId,
      userId: inviteDto.userId,
      role: inviteDto.role,
      invitedBy: inviterId,
      message: inviteDto.message,
      workspaceId: inviteDto.workspaceId,
      expiresAt,
      status: 'pending',
    });

    const savedInvitation =
      await this.internalInvitationRepository.save(invitation);

    // Load with relations
    const invitationWithRelations =
      await this.internalInvitationRepository.findOne({
        where: { id: savedInvitation.id },
        relations: ['inviter', 'organization', 'user'],
      });

    if (!invitationWithRelations) {
      throw new Error('Failed to load invitation with relations');
    }

    // Send in-app notification
    await this.sendInternalInvitationNotification(
      targetUser,
      organization,
      inviter,
      invitationWithRelations,
      inviteDto,
    );

    this.logger.log(
      `Internal invitation sent: ${targetUser.email} to ${organization.name}`,
    );

    return this.mapInternalInvitationToResponseDto(invitationWithRelations);
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
        id: organization.owner?.id || '',
        firstName: organization.owner?.firstName || '',
        lastName: organization.owner?.lastName || '',
        email: organization.owner?.email || '',
        avatar: organization.owner?.avatar || null,
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
      inviter: invitation.inviter
        ? {
            id: invitation.inviter.id,
            firstName: invitation.inviter.firstName,
            lastName: invitation.inviter.lastName,
          }
        : null,
      organization: invitation.organization
        ? {
            id: invitation.organization.id,
            name: invitation.organization.name,
          }
        : null,
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

  // ==================== SUPER_ADMIN METHODS ====================

  async getAllOrganizations(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    plan?: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<SuperAdminOrganizationListDto> {
    const { page, limit, search, status, plan, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.owner', 'owner')
      .leftJoinAndSelect('organization.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('organization.workspaces', 'workspaces');

    // Apply search filter
    if (search) {
      queryBuilder.where(
        '(organization.name ILIKE :search OR organization.description ILIKE :search OR organization.industry ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply status filter
    if (status) {
      if (status === 'active') {
        queryBuilder.andWhere('organization.isActive = :isActive', {
          isActive: true,
        });
      } else if (status === 'suspended') {
        queryBuilder.andWhere('organization.isActive = :isActive', {
          isActive: false,
        });
      }
    }

    // Apply plan filter
    if (plan) {
      queryBuilder.andWhere('organization.plan = :plan', { plan });
    }

    // Apply sorting
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'name',
      'memberCount',
      'workspaceCount',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    if (sortField === 'memberCount') {
      queryBuilder
        .addSelect('COUNT(DISTINCT members.id)', 'memberCount')
        .groupBy('organization.id')
        .orderBy('memberCount', sortOrder);
    } else if (sortField === 'workspaceCount') {
      queryBuilder
        .addSelect('COUNT(DISTINCT workspaces.id)', 'workspaceCount')
        .groupBy('organization.id')
        .orderBy('workspaceCount', sortOrder);
    } else {
      queryBuilder.orderBy(`organization.${sortField}`, sortOrder);
    }

    // Get total count
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply pagination
    const organizations = await queryBuilder.skip(skip).take(limit).getMany();

    // Transform to response DTOs
    const organizationDtos = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await this.organizationMemberRepository.count({
          where: { organization: { id: org.id } },
        });
        const workspaceCount = await this.workspaceRepository.count({
          where: { organization: { id: org.id } },
        });

        return {
          ...this.mapToResponseDto(org),
          memberCount,
          workspaceCount,
        };
      }),
    );

    return {
      organizations: organizationDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getGlobalStats(): Promise<SuperAdminOrganizationStatsDto> {
    const totalOrganizations = await this.organizationRepository.count();
    const activeOrganizations = await this.organizationRepository.count({
      where: { isActive: true },
    });
    const suspendedOrganizations = totalOrganizations - activeOrganizations;

    const totalMembers = await this.organizationMemberRepository.count();
    const totalWorkspaces = await this.workspaceRepository.count();

    // Get plan distribution
    const planDistribution = await this.organizationRepository
      .createQueryBuilder('org')
      .select('org.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('org.plan')
      .getRawMany();

    const planStats = planDistribution.reduce((acc, item) => {
      acc[item.plan] = parseInt(item.count);
      return acc;
    }, {});

    // Get recent organizations (last 10)
    const recentOrganizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['members', 'members.user'],
    });

    // Get growth stats
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const organizationsThisMonth = await this.organizationRepository.count({
      where: { createdAt: MoreThanOrEqual(thisMonthStart) },
    });

    const organizationsLastMonth = await this.organizationRepository.count({
      where: {
        createdAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    const membersThisMonth = await this.organizationMemberRepository.count({
      where: { createdAt: MoreThanOrEqual(thisMonthStart) },
    });

    const membersLastMonth = await this.organizationMemberRepository.count({
      where: {
        createdAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    return {
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalMembers,
      totalWorkspaces,
      totalProjects: 0, // Will be implemented when project module is ready
      planDistribution: planStats,
      recentOrganizations: recentOrganizations.map((org) =>
        this.mapToResponseDto(org),
      ),
      growthStats: {
        organizationsThisMonth,
        organizationsLastMonth,
        membersThisMonth,
        membersLastMonth,
      },
    };
  }

  async getOrganizationAsAdmin(id: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user', 'workspaces'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.mapToResponseDto(organization);
  }

  async updateOrganizationAsAdmin(
    id: string,
    updateDto: SuperAdminUpdateOrganizationDto,
    adminId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Update organization
    Object.assign(organization, updateDto);
    const updatedOrganization =
      await this.organizationRepository.save(organization);

    this.logger.log(
      `Organization updated by SUPER_ADMIN: ${organization.name} by admin ${adminId}`,
    );

    // Send notification to organization owner if status changed
    if (updateDto.isActive !== undefined) {
      await this.notificationService.sendNotification({
        type: NotificationType.SYSTEM_UPDATE,
        title: updateDto.isActive
          ? 'Organization Activated'
          : 'Organization Suspended',
        message: updateDto.isActive
          ? 'Your organization has been activated by system administrator.'
          : `Your organization has been suspended. ${updateDto.suspensionReason || 'Please contact support for more information.'}`,
        recipientId: organization.ownerId,
        channels: [NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        data: {
          organizationId: id,
          organizationName: organization.name,
          reason: updateDto.suspensionReason,
        },
      });
    }

    return this.mapToResponseDto(updatedOrganization);
  }

  async deleteOrganizationAsAdmin(
    id: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['members', 'workspaces'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Soft delete - mark as inactive and archive
    organization.isActive = false;
    organization.suspensionReason = 'Deleted by system administrator';
    await this.organizationRepository.save(organization);

    // Archive all workspaces
    if (organization.workspaces && organization.workspaces.length > 0) {
      await this.workspaceRepository.update(
        { organization: { id } },
        {
          archivedAt: new Date(),
          archivedBy: adminId,
          isActive: false,
        },
      );
    }

    this.logger.log(
      `Organization deleted by SUPER_ADMIN: ${organization.name} by admin ${adminId}`,
    );

    // Notify organization owner
    await this.notificationService.sendNotification({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Organization Deleted',
      message:
        'Your organization has been deleted by system administrator. All data has been archived.',
      recipientId: organization.ownerId,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      data: {
        organizationId: id,
        organizationName: organization.name,
      },
    });

    return { message: 'Organization deleted successfully' };
  }

  async suspendOrganization(
    id: string,
    reason: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    organization.isActive = false;
    organization.suspensionReason =
      reason || 'Suspended by system administrator';
    await this.organizationRepository.save(organization);

    this.logger.log(
      `Organization suspended by SUPER_ADMIN: ${organization.name} by admin ${adminId}`,
    );

    // Notify organization owner
    await this.notificationService.sendNotification({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Organization Suspended',
      message: `Your organization has been suspended. ${reason || 'Please contact support for more information.'}`,
      recipientId: organization.ownerId,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      data: {
        organizationId: id,
        organizationName: organization.name,
        reason,
      },
    });

    return { message: 'Organization suspended successfully' };
  }

  async activateOrganization(
    id: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    organization.isActive = true;
    organization.suspensionReason = null;
    await this.organizationRepository.save(organization);

    this.logger.log(
      `Organization activated by SUPER_ADMIN: ${organization.name} by admin ${adminId}`,
    );

    // Notify organization owner
    await this.notificationService.sendNotification({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Organization Activated',
      message:
        'Your organization has been activated. You can now access all features.',
      recipientId: organization.ownerId,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.MEDIUM,
      data: {
        organizationId: id,
        organizationName: organization.name,
      },
    });

    return { message: 'Organization activated successfully' };
  }

  async getOrganizationMembersAsAdmin(
    id: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const members = await this.organizationMemberRepository.find({
      where: { organizationId: id, isActive: true },
      relations: ['user', 'inviter'],
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.mapMemberToResponseDto(member));
  }

  async getOrganizationWorkspacesAsAdmin(
    id: string,
  ): Promise<OrganizationWorkspaceDto[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const workspaces = await this.workspaceRepository.find({
      where: { organization: { id } },
      relations: ['members', 'projects'],
    });

    return workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      visibility: workspace.visibility,
      memberCount: workspace.members?.length || 0,
      projectCount: workspace.projects?.length || 0,
      isArchived: workspace.isArchived,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }));
  }

  async getOrganizationActivityAsAdmin(
    id: string,
    options: { page: number; limit: number },
  ): Promise<{
    activities: OrganizationActivityDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // This is a placeholder implementation
    // In a real application, you would have an activity/audit log table
    const activities: OrganizationActivityDto[] = [
      {
        id: '1',
        action: 'organization_created',
        description: 'Organization was created',
        performedBy: {
          id: organization.ownerId,
          name: 'System',
          email: 'system@invictask.com',
        },
        targetEntity: {
          type: 'organization',
          id: organization.id,
          name: organization.name,
        },
        metadata: {},
        createdAt: organization.createdAt,
      },
    ];

    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const paginatedActivities = activities.slice(skip, skip + limit);

    return {
      activities: paginatedActivities,
      total: activities.length,
      page,
      limit,
    };
  }

  // ==================== ACCEPTANCE METHODS ====================

  async acceptInvitationWithAccount(
    acceptDto: AcceptInvitationWithAccountDto,
  ): Promise<AcceptInvitationResponseDto> {
    const invitation = await this.organizationInvitationRepository.findOne({
      where: { token: acceptDto.token, isAccepted: false },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.email !== acceptDto.email) {
      throw new ForbiddenException('Email does not match invitation email');
    }

    // Check if user already exists
    let user = await this.userRepository.findOne({
      where: { email: acceptDto.email },
    });

    if (user) {
      throw new ConflictException(
        'User already exists. Please use the regular accept invitation endpoint.',
      );
    }

    // Create new user account
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(acceptDto.password, 10);

    user = this.userRepository.create({
      firstName: acceptDto.firstName,
      lastName: acceptDto.lastName,
      email: acceptDto.email,
      password: hashedPassword,
      displayName:
        acceptDto.displayName || `${acceptDto.firstName} ${acceptDto.lastName}`,
      isEmailVerified: true, // Auto-verify since they accepted invitation
    });

    const savedUser = await this.userRepository.save(user);

    // Create organization member
    const organizationMember = this.organizationMemberRepository.create({
      organizationId: invitation.organizationId,
      userId: savedUser.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
    });

    await this.organizationMemberRepository.save(organizationMember);

    // Mark invitation as accepted
    invitation.isAccepted = true;
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = savedUser.id;
    await this.organizationInvitationRepository.save(invitation);

    // Send notification to organization admins
    await this.notificationService.sendNotification({
      type: NotificationType.ORGANIZATION_MEMBER_JOINED,
      title: 'New Member Joined',
      message: `${savedUser.firstName} ${savedUser.lastName} has joined your organization`,
      recipientId: invitation.organization.ownerId,
      senderId: savedUser.id,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      data: {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        newMemberName: `${savedUser.firstName} ${savedUser.lastName}`,
        newMemberEmail: savedUser.email,
        role: invitation.role,
      },
    });

    this.logger.log(
      `New user created and joined organization: ${savedUser.email} joined ${invitation.organization.name}`,
    );

    return {
      success: true,
      message: 'Account created and successfully joined organization',
      user: {
        id: savedUser.id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      membership: {
        id: organizationMember.id,
        role: invitation.role,
        joinedAt: organizationMember.joinedAt,
      },
    };
  }

  async acceptInternalInvitation(
    invitationId: string,
    userId: string,
  ): Promise<AcceptInvitationResponseDto> {
    const invitation = await this.internalInvitationRepository.findOne({
      where: { id: invitationId, userId, status: 'pending' },
      relations: ['organization', 'user'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
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

    // Update invitation status
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await this.internalInvitationRepository.save(invitation);

    // Send notification to organization admins
    await this.notificationService.sendNotification({
      type: NotificationType.INTERNAL_INVITATION_ACCEPTED,
      title: 'Internal Invitation Accepted',
      message: `${invitation.user.firstName} ${invitation.user.lastName} has accepted your invitation`,
      recipientId: invitation.organization.ownerId,
      senderId: userId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      data: {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        memberName: `${invitation.user.firstName} ${invitation.user.lastName}`,
        memberEmail: invitation.user.email,
        role: invitation.role,
      },
    });

    this.logger.log(
      `Internal invitation accepted: ${invitation.user.email} joined ${invitation.organization.name}`,
    );

    return {
      success: true,
      message: 'Successfully joined organization',
      user: {
        id: invitation.user.id,
        firstName: invitation.user.firstName,
        lastName: invitation.user.lastName,
        email: invitation.user.email,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      membership: {
        id: organizationMember.id,
        role: invitation.role,
        joinedAt: organizationMember.joinedAt,
      },
    };
  }

  async declineInternalInvitation(
    invitationId: string,
    userId: string,
    declineDto: DeclineInvitationDto,
  ): Promise<{ message: string }> {
    const invitation = await this.internalInvitationRepository.findOne({
      where: { id: invitationId, userId, status: 'pending' },
      relations: ['organization', 'user', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    // Update invitation status
    invitation.status = 'declined';
    invitation.respondedAt = new Date();
    invitation.declineReason = declineDto.reason || null;
    await this.internalInvitationRepository.save(invitation);

    // Send notification to inviter
    await this.notificationService.sendNotification({
      type: NotificationType.INTERNAL_INVITATION_DECLINED,
      title: 'Invitation Declined',
      message: `${invitation.user.firstName} ${invitation.user.lastName} has declined your invitation`,
      recipientId: invitation.invitedBy,
      senderId: userId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      data: {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        memberName: `${invitation.user.firstName} ${invitation.user.lastName}`,
        memberEmail: invitation.user.email,
        role: invitation.role,
        reason: declineDto.reason,
      },
    });

    this.logger.log(
      `Internal invitation declined: ${invitation.user.email} declined ${invitation.organization.name}`,
    );

    return { message: 'Invitation declined successfully' };
  }

  // ==================== HELPER METHODS ====================

  private async sendExternalInvitationNotification(
    email: string,
    organization: Organization,
    inviter: User,
    invitation: OrganizationInvitation,
    inviteDto: InviteMultipleMembersDto,
  ): Promise<void> {
    try {
      this.logger.debug(`Sending external invitation email to: ${email}`);

      await this.notificationService.sendNotification({
        type: NotificationType.ORGANIZATION_INVITATION,
        title: `You've been invited to join ${organization.name}`,
        message: `${inviter.firstName} ${inviter.lastName} has invited you to join ${organization.name}${inviteDto.message ? `. Message: ${inviteDto.message}` : ''}`,
        recipientId: `email:${email}`, // Special format for email-only recipients
        senderId: inviter.id,
        channels: [NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        data: {
          organizationId: organization.id,
          organizationName: organization.name,
          inviterName: `${inviter.firstName} ${inviter.lastName}`,
          inviterEmail: inviter.email,
          token: invitation.token,
          role: inviteDto.role,
          message: inviteDto.message,
          acceptUrl: `${process.env.FRONTEND_URL}/accept-invitation?token=${invitation.token}`,
          workspaceId: inviteDto.workspaceId,
          expiresAt: invitation.expiresAt,
          pricingPlan: inviteDto.pricingPlan || 'free',
          planFeatures: inviteDto.planFeatures || 'Basic features included',
        },
      });

      this.logger.debug(
        `External invitation email sent successfully to: ${email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send external invitation email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  private async sendInternalInvitationNotification(
    targetUser: User,
    organization: Organization,
    inviter: User,
    invitation: InternalInvitation,
    inviteDto: InternalInviteDto,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Sending internal invitation notification to: ${targetUser.email}`,
      );

      await this.notificationService.sendNotification({
        type: NotificationType.INTERNAL_INVITATION,
        title: `You've been invited to join ${organization.name}`,
        message: `${inviter.firstName} ${inviter.lastName} has invited you to join ${organization.name}${inviteDto.message ? `. Message: ${inviteDto.message}` : ''}`,
        recipientId: targetUser.id,
        senderId: inviter.id,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        data: {
          invitationId: invitation.id,
          organizationId: organization.id,
          organizationName: organization.name,
          inviterName: `${inviter.firstName} ${inviter.lastName}`,
          inviterEmail: inviter.email,
          role: inviteDto.role,
          message: inviteDto.message,
          workspaceId: inviteDto.workspaceId,
          expiresAt: invitation.expiresAt,
          acceptUrl: `${process.env.FRONTEND_URL}/internal-invitation/${invitation.id}/accept`,
          declineUrl: `${process.env.FRONTEND_URL}/internal-invitation/${invitation.id}/decline`,
        },
      });

      this.logger.debug(
        `Internal invitation notification sent successfully to: ${targetUser.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send internal invitation notification to ${targetUser.email}:`,
        error,
      );
      throw error;
    }
  }

  private mapInternalInvitationToResponseDto(
    invitation: InternalInvitation,
  ): InternalInvitationResponseDto {
    return {
      id: invitation.id,
      userId: invitation.userId,
      role: invitation.role,
      message: invitation.message,
      status: invitation.status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      inviter: invitation.inviter
        ? {
            id: invitation.inviter.id,
            firstName: invitation.inviter.firstName,
            lastName: invitation.inviter.lastName,
          }
        : null,
      organization: invitation.organization
        ? {
            id: invitation.organization.id,
            name: invitation.organization.name,
          }
        : null,
      user: invitation.user
        ? {
            id: invitation.user.id,
            firstName: invitation.user.firstName,
            lastName: invitation.user.lastName,
            email: invitation.user.email,
          }
        : null,
    };
  }
}
