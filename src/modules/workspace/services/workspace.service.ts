import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as crypto from 'crypto';

import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  WorkspaceVisibility,
} from '../../../entities/workspace.entity';
import { User } from '../../../entities/user.entity';
import {
  Organization,
  OrganizationMember,
} from '../../../entities/organization.entity';
import { Project } from '../../../entities/project.entity';
import { Task, TaskStatus } from '../../../entities/task.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/enums/notification.enum';

import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateMemberRoleDto,
  WorkspaceResponseDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceStatsDto,
  WorkspaceFilterDto,
} from '../dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(WorkspaceInvitation)
    private readonly workspaceInvitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
    organizationId: string,
  ): Promise<WorkspaceResponseDto> {
    // Check if user is a member of the organization
    const orgMember = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!orgMember) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    // Generate slug if not provided
    const slug =
      createWorkspaceDto.slug || this.generateSlug(createWorkspaceDto.name);

    // Check if slug is unique within organization
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { organizationId, slug },
    });

    if (existingWorkspace) {
      throw new ConflictException(
        'Workspace with this slug already exists in the organization',
      );
    }

    // Create workspace
    const workspace = this.workspaceRepository.create({
      ...createWorkspaceDto,
      slug,
      organizationId,
      ownerId: userId,
      settings: {
        ...this.getDefaultSettings(),
        ...createWorkspaceDto.settings,
      },
    } as any);

    const savedWorkspace = (await this.workspaceRepository.save(
      workspace,
    )) as unknown as Workspace;

    // Add creator as workspace admin
    const workspaceMember = this.workspaceMemberRepository.create({
      workspaceId: savedWorkspace.id,
      userId,
      role: WorkspaceRole.ADMIN,
      joinedAt: new Date(),
    });

    await this.workspaceMemberRepository.save(workspaceMember);

    this.logger.log(
      `Workspace created: ${savedWorkspace.name} by user ${userId}`,
    );

    return this.mapToResponseDto(savedWorkspace);
  }

  async findUserWorkspaces(
    userId: string,
    filter: WorkspaceFilterDto,
  ): Promise<{ workspaces: WorkspaceResponseDto[]; total: number }> {
    const {
      search,
      visibility,
      organizationId,
      sortBy,
      sortOrder,
      page,
      limit,
    } = filter;

    const queryBuilder = this.workspaceRepository
      .createQueryBuilder('workspace')
      .leftJoin('workspace.members', 'member')
      .leftJoin('workspace.organization', 'organization')
      .leftJoin('workspace.owner', 'owner')
      .where('member.userId = :userId AND member.isActive = true', { userId });

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(workspace.name ILIKE :search OR workspace.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (visibility) {
      queryBuilder.andWhere('workspace.visibility = :visibility', {
        visibility,
      });
    }

    if (organizationId) {
      queryBuilder.andWhere('workspace.organizationId = :organizationId', {
        organizationId,
      });
    }

    queryBuilder.andWhere('workspace.isActive = true');

    // Apply sorting
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'DESC';
    queryBuilder.orderBy(`workspace.${sortField}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [workspaces, total] = await queryBuilder.getManyAndCount();

    return {
      workspaces: workspaces.map((workspace) =>
        this.mapToResponseDto(workspace),
      ),
      total,
    };
  }

  async findOne(id: string, userId: string): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['owner', 'organization'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is a member
    await this.checkMembership(id, userId);

    return this.mapToResponseDto(workspace);
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['owner', 'organization'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check permissions (only owner and admins can update)
    await this.checkPermissions(id, userId, [WorkspaceRole.ADMIN]);

    // Update slug if name changed
    if (updateWorkspaceDto.name && updateWorkspaceDto.name !== workspace.name) {
      const newSlug =
        updateWorkspaceDto.slug || this.generateSlug(updateWorkspaceDto.name);

      // Check if new slug is unique within organization
      const existingWorkspace = await this.workspaceRepository.findOne({
        where: {
          organizationId: workspace.organizationId,
          slug: newSlug,
          id: Not(id),
        },
      });

      if (existingWorkspace) {
        throw new ConflictException(
          'Workspace with this slug already exists in the organization',
        );
      }

      updateWorkspaceDto.slug = newSlug;
    }

    Object.assign(workspace, updateWorkspaceDto);
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    this.logger.log(`Workspace updated: ${workspace.name} by user ${userId}`);

    return this.mapToResponseDto(updatedWorkspace);
  }

  async inviteMember(
    workspaceId: string,
    inviteMemberDto: InviteWorkspaceMemberDto,
    inviterId: string,
  ): Promise<WorkspaceInvitationResponseDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['organization'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check permissions
    await this.checkPermissions(workspaceId, inviterId, [WorkspaceRole.ADMIN]);

    // Check if user is already a member
    const existingMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, user: { email: inviteMemberDto.email } },
      relations: ['user'],
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.workspaceInvitationRepository.findOne(
      {
        where: { workspaceId, email: inviteMemberDto.email, isAccepted: false },
      },
    );

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = this.workspaceInvitationRepository.create({
      workspaceId,
      email: inviteMemberDto.email,
      role: inviteMemberDto.role,
      invitedBy: inviterId,
      token,
      message: inviteMemberDto.message,
      expiresAt,
    });

    const savedInvitation =
      await this.workspaceInvitationRepository.save(invitation);

    // Send invitation email
    await this.notificationService.sendNotification({
      type: NotificationType.TEAM_INVITATION,
      title: 'Workspace Invitation',
      message: `You have been invited to join "${workspace.name}" workspace`,
      recipientId: 'email:' + inviteMemberDto.email,
      senderId: inviterId,
      channels: ['email'] as any,
      priority: 'medium' as any,
      data: {
        workspaceId,
        workspaceName: workspace.name,
        organizationName: workspace.organization.name,
        role: inviteMemberDto.role,
        inviteMessage: inviteMemberDto.message,
        inviteUrl: `${process.env.FRONTEND_URL}/accept-workspace-invitation?token=${token}`,
        expiresAt,
      },
    });

    this.logger.log(
      `Workspace invitation sent: ${inviteMemberDto.email} to ${workspace.name}`,
    );

    return this.mapInvitationToResponseDto(savedInvitation);
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ message: string }> {
    const invitation = await this.workspaceInvitationRepository.findOne({
      where: { token, isAccepted: false },
      relations: ['workspace', 'inviter'],
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
    const existingMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: invitation.workspaceId, userId },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Create workspace member
    const workspaceMember = this.workspaceMemberRepository.create({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    } as any);

    await this.workspaceMemberRepository.save(workspaceMember);

    // Mark invitation as accepted
    invitation.isAccepted = true;
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;
    await this.workspaceInvitationRepository.save(invitation);

    this.logger.log(
      `Workspace invitation accepted: ${user.email} joined ${invitation.workspace.name}`,
    );

    return { message: 'Successfully joined workspace' };
  }

  async getMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberResponseDto[]> {
    await this.checkMembership(workspaceId, userId);

    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId, isActive: true },
      relations: ['user', 'inviter'],
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.mapMemberToResponseDto(member));
  }

  async getStats(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceStatsDto> {
    await this.checkMembership(workspaceId, userId);

    const totalMembers = await this.workspaceMemberRepository.count({
      where: { workspaceId, isActive: true },
    });

    const totalProjects = await this.projectRepository.count({
      where: { workspaceId, isActive: true },
    });

    const totalTasks = await this.taskRepository.count({
      where: { project: { workspaceId }, isActive: true },
    });

    const completedTasks = await this.taskRepository.count({
      where: {
        project: { workspaceId },
        status: TaskStatus.DONE,
        isActive: true,
      },
    });

    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('project.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status != :doneStatus', { doneStatus: 'done' })
      .andWhere('task.isActive = true')
      .getCount();

    return {
      totalMembers,
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      activeMembers: totalMembers, // TODO: Calculate based on recent activity
      recentActivity: [], // TODO: Implement activity tracking
    };
  }

  private async checkMembership(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this workspace');
    }
  }

  private async checkPermissions(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<void> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this workspace');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private mapToResponseDto(workspace: Workspace): WorkspaceResponseDto {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      avatar: workspace.avatar,
      coverImage: workspace.coverImage,
      visibility: workspace.visibility,
      memberCount: workspace.memberCount,
      projectCount: workspace.projectCount,
      owner: {
        id: workspace.owner.id,
        firstName: workspace.owner.firstName,
        lastName: workspace.owner.lastName,
        email: workspace.owner.email,
        avatar: workspace.owner.avatar,
      },
      organization: {
        id: workspace.organization.id,
        name: workspace.organization.name,
      },
      settings: workspace.settings,
      isActive: workspace.isActive,
      isArchived: workspace.isArchived,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  private mapMemberToResponseDto(
    member: WorkspaceMember,
  ): WorkspaceMemberResponseDto {
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
      addedBy: member.inviter
        ? {
            id: member.inviter.id,
            firstName: member.inviter.firstName,
            lastName: member.inviter.lastName,
          }
        : undefined,
    };
  }

  private mapInvitationToResponseDto(
    invitation: WorkspaceInvitation,
  ): WorkspaceInvitationResponseDto {
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
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
      },
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async remove(id: string, userId: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check permissions (only owner and admins can delete)
    await this.checkPermissions(id, userId, [WorkspaceRole.ADMIN]);

    // Soft delete
    await this.workspaceRepository.update(id, {
      isActive: false,
      isArchived: true,
    });

    this.logger.log(`Workspace deleted: ${workspace.name} by user ${userId}`);
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
    userId: string,
  ): Promise<WorkspaceMemberResponseDto> {
    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    const member = await this.workspaceMemberRepository.findOne({
      where: { id: memberId, workspaceId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = updateMemberRoleDto.role;
    const updatedMember = await this.workspaceMemberRepository.save(member);

    this.logger.log(
      `Member role updated: ${member.user.email} to ${updateMemberRoleDto.role}`,
    );

    return this.mapMemberToResponseDto(updatedMember);
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    const member = await this.workspaceMemberRepository.findOne({
      where: { id: memberId, workspaceId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove workspace owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (workspace && workspace.ownerId === member.userId) {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    member.isActive = false;
    await this.workspaceMemberRepository.save(member);

    this.logger.log(
      `Member removed: ${member.user.email} from workspace ${workspaceId}`,
    );
  }

  async getInvitations(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceInvitationResponseDto[]> {
    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    const invitations = await this.workspaceInvitationRepository.find({
      where: { workspaceId, isAccepted: false },
      relations: ['inviter', 'workspace'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((invitation) =>
      this.mapInvitationToResponseDto(invitation),
    );
  }

  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    const invitation = await this.workspaceInvitationRepository.findOne({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.workspaceInvitationRepository.remove(invitation);

    this.logger.log(
      `Invitation cancelled: ${invitation.email} for workspace ${workspaceId}`,
    );
  }

  async archive(
    workspaceId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    await this.workspaceRepository.update(workspaceId, { isArchived: true });

    this.logger.log(`Workspace archived: ${workspace.name} by user ${userId}`);

    return { message: 'Workspace archived successfully' };
  }

  async restore(
    workspaceId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    await this.workspaceRepository.update(workspaceId, { isArchived: false });

    this.logger.log(`Workspace restored: ${workspace.name} by user ${userId}`);

    return { message: 'Workspace restored successfully' };
  }

  async duplicate(
    workspaceId: string,
    duplicateDto: { name: string; includeMembers?: boolean },
    userId: string,
  ): Promise<WorkspaceResponseDto> {
    const originalWorkspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['organization'],
    });

    if (!originalWorkspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkMembership(workspaceId, userId);

    // Create new workspace
    const newWorkspace = this.workspaceRepository.create({
      name: duplicateDto.name,
      slug: this.generateSlug(duplicateDto.name),
      description: `Copy of ${originalWorkspace.name}`,
      organizationId: originalWorkspace.organizationId,
      ownerId: userId,
      visibility: originalWorkspace.visibility,
      settings: originalWorkspace.settings,
    } as any);

    const savedWorkspace = (await this.workspaceRepository.save(
      newWorkspace,
    )) as unknown as Workspace;

    // Add creator as admin
    const workspaceMember = this.workspaceMemberRepository.create({
      workspaceId: savedWorkspace.id,
      userId,
      role: WorkspaceRole.ADMIN,
      joinedAt: new Date(),
    } as any);

    await this.workspaceMemberRepository.save(workspaceMember);

    // Copy members if requested
    if (duplicateDto.includeMembers) {
      const originalMembers = await this.workspaceMemberRepository.find({
        where: { workspaceId, isActive: true },
      });

      for (const member of originalMembers) {
        if (member.userId !== userId) {
          // Skip creator as already added
          const newMember = this.workspaceMemberRepository.create({
            workspaceId: savedWorkspace.id,
            userId: member.userId,
            role: member.role,
            joinedAt: new Date(),
          } as any);

          await this.workspaceMemberRepository.save(newMember);
        }
      }
    }

    this.logger.log(
      `Workspace duplicated: ${originalWorkspace.name} -> ${duplicateDto.name}`,
    );

    return this.mapToResponseDto(savedWorkspace);
  }

  async getActivity(
    workspaceId: string,
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<{
    activities: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.checkMembership(workspaceId, userId);

    // TODO: Implement activity tracking
    // For now, return empty array
    return {
      activities: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async leave(
    workspaceId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Cannot leave if user is the owner
    if (workspace.ownerId === userId) {
      throw new ForbiddenException(
        'Workspace owner cannot leave. Transfer ownership first.',
      );
    }

    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId, isActive: true },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    member.isActive = false;
    await this.workspaceMemberRepository.save(member);

    this.logger.log(`User ${userId} left workspace ${workspaceId}`);

    return { message: 'Successfully left workspace' };
  }

  async getTemplates(workspaceId: string, userId: string): Promise<any[]> {
    await this.checkMembership(workspaceId, userId);

    // TODO: Implement workspace templates
    // For now, return empty array
    return [];
  }

  async createTemplate(
    workspaceId: string,
    templateDto: any,
    userId: string,
  ): Promise<any> {
    await this.checkPermissions(workspaceId, userId, [WorkspaceRole.ADMIN]);

    // TODO: Implement template creation
    // For now, return the template data
    return templateDto;
  }

  async findAll(
    filter: WorkspaceFilterDto,
  ): Promise<{ workspaces: WorkspaceResponseDto[]; total: number }> {
    const {
      search,
      visibility,
      organizationId,
      sortBy,
      sortOrder,
      page,
      limit,
    } = filter;

    const queryBuilder = this.workspaceRepository
      .createQueryBuilder('workspace')
      .leftJoin('workspace.organization', 'organization')
      .leftJoin('workspace.owner', 'owner');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(workspace.name ILIKE :search OR workspace.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (visibility) {
      queryBuilder.andWhere('workspace.visibility = :visibility', {
        visibility,
      });
    }

    if (organizationId) {
      queryBuilder.andWhere('workspace.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Apply sorting
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'DESC';
    queryBuilder.orderBy(`workspace.${sortField}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [workspaces, total] = await queryBuilder.getManyAndCount();

    return {
      workspaces: workspaces.map((workspace) =>
        this.mapToResponseDto(workspace),
      ),
      total,
    };
  }

  async forceUpdate(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['owner', 'organization'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    Object.assign(workspace, updateWorkspaceDto);
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    this.logger.log(
      `Workspace force updated: ${workspace.name} by SUPER_ADMIN`,
    );

    return this.mapToResponseDto(updatedWorkspace);
  }

  private getDefaultSettings() {
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
}
